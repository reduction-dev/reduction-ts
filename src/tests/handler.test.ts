import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { type Client, createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { expect, test } from 'bun:test';
import { ReductionJob } from "../core/job";
import * as pb from "../proto/handlerpb/handler_pb";
import type { KeyedEvent, OperatorHandler, Subject } from "../types";

test('Process Keyed Event', async () => {
  const now = new Date();
  
  const handler = new TestHandler({
    onEvent: (subject, event) => {
      subject.setTimer(now)
      subject.emit('test-sink', new TextEncoder().encode("test-output"));
    }
  });
  
  // Setup server and client
  const client = await setupTestServer(handler);
  
  // Create the request with a keyed event
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      create(pb.EventSchema, {
        event: {
          case: 'keyedEvent',
          value: create(pb.KeyedEventSchema, {
            key: new TextEncoder().encode("test-key"),
            timestamp: timestampFromDate(now),
            value: new TextEncoder().encode("test-input")
          })
        }
      })
    ]
  });
  
  // Call the server
  const response = await client.processEventBatch(request);
  
  // Validate the response structure
  expect(response.keyResults.length).toBe(1);
  expect(response.sinkRequests.length).toBe(1);
  
  // Verify key result
  const keyResult = response.keyResults[0];
  expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
  expect(keyResult.newTimers.length).toBe(1);
  
  // Verify sink request
  const sinkRequest = response.sinkRequests[0];
  expect(sinkRequest.id).toBe("test-sink");
  expect(Buffer.from(sinkRequest.value).toString()).toBe("test-output");
});

test('Process Timer Expired', async () => {
  const handler = new TestHandler({
    onTimerExpired: (subject, timer) => {
      subject.emit('timer-sink', new TextEncoder().encode("timer-output"));
    }
  });
  
  // Setup server and client
  const client = await setupTestServer(handler);
  const now = new Date();
  
  // Create the request with a timer expired event
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      create(pb.EventSchema, {
        event: {
          case: 'timerExpired',
          value: create(pb.TimerExpiredSchema, {
            key: new TextEncoder().encode("test-key"),
            timestamp: timestampFromDate(now)
          })
        }
      })
    ]
  });
  
  // Call the server
  const response = await client.processEventBatch(request);
  
  // Validate the response structure
  expect(response.keyResults.length).toBe(1);
  expect(response.sinkRequests.length).toBe(1);
  
  // Verify key result
  const keyResult = response.keyResults[0];
  expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
  
  // Verify sink request
  const sinkRequest = response.sinkRequests[0];
  expect(sinkRequest.id).toBe("timer-sink");
  expect(Buffer.from(sinkRequest.value).toString()).toBe("timer-output");
});

test('Process State Mutations', async () => {
  const handler = new TestHandler({
    onEvent: (subject, event) => {
      subject.putState('test-state', 
        new TextEncoder().encode("count"), 
        new Uint8Array([42])
      );
    },
  });
  
  const client = await setupTestServer(handler);
  const now = new Date();
  
  // Create the request with an initial state
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      create(pb.EventSchema, {
        event: {
          case: 'keyedEvent',
          value: create(pb.KeyedEventSchema, {
            key: new TextEncoder().encode("test-key"),
            timestamp: timestampFromDate(now),
            value: new TextEncoder().encode("test-input")
          })
        }
      })
    ],
    keyStates: [
      create(pb.KeyStateSchema, {
        key: new TextEncoder().encode("test-key"),
        stateEntryNamespaces: [
          create(pb.StateEntryNamespaceSchema, {
            namespace: "test-state",
            entries: [
              create(pb.StateEntrySchema, {
                key: new TextEncoder().encode("count"),
                value: new Uint8Array([0]) // Initial value of 0
              })
            ]
          })
        ]
      })
    ]
  });
  
  // Call the server
  const response = await client.processEventBatch(request);
  
  // Validate the response structure
  expect(response.keyResults.length).toBe(1);
  
  // Verify key result has state mutations
  const keyResult = response.keyResults[0];
  expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
  expect(keyResult.stateMutationNamespaces.length).toBe(1);
  
  // Verify namespace and mutation
  const namespace = keyResult.stateMutationNamespaces[0];
  expect(namespace.namespace).toBe("test-state");
  expect(namespace.mutations.length).toBe(1);
  
  // Verify it's a put mutation with the correct value
  const mutation = namespace.mutations[0];
  expect(mutation.mutation.case).toBe("put");
  if (mutation.mutation.case === "put") {
    expect(Buffer.from(mutation.mutation.value.key).toString()).toBe("count");
    expect(mutation.mutation.value.value[0]).toBe(42);
  }
});

// Test handler implementation for tests
class TestHandler implements OperatorHandler{
  onEventFn?: (subject: Subject, event: KeyedEvent) => void;
  onTimerExpiredFn?: (subject: Subject, timer: Date) => void;

  constructor(options: {
    onEvent?: (subject: Subject, event: KeyedEvent) => void,
    onTimerExpired?: (subject: Subject, timer: Date) => void,
  } = {}) {
    this.onEventFn = options.onEvent;
    this.onTimerExpiredFn = options.onTimerExpired;
  }

  onEvent(subject: Subject, event: KeyedEvent): void {
    this.onEventFn?.(subject, event);
  }

  onTimerExpired(subject: Subject, timer: Date): void {
    this.onTimerExpiredFn?.(subject, timer);
  }
}

// Setup function to create a test server and client
async function setupTestServer(handler: TestHandler): Promise<Client<typeof pb.Handler>> {
  const job = new ReductionJob(handler, {
    sources: [{ id: 'test-source', type: 'embedded', keyEvent: (ev: Uint8Array) => [] }],
    sinks: [{ id: 'test-sink', type: 'stdio' }]
  }, { port: 0 });

  const port = await job.serve();

  const client = createClient(pb.Handler, createConnectTransport({
    baseUrl: `http://localhost:${port}`,
    httpVersion: "1.1"
  }));

  return client;
}
