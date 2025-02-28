import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { type Client, createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import * as stdio from "@rxn/connectors/stdio";
import type { Subject } from "@rxn/handler/subject";
import * as topology from "@rxn/topology";
import { expect, test } from 'bun:test';
import * as pb from "../proto/handlerpb/handler_pb";
import { Server } from "../server/server";
import { Job } from "../topology/job";
import type { KeyedEvent, OperatorHandler } from "../types";

const now = new Date();

test('Process Keyed Event', async () => {
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    return new TestHandler({
      onEvent: (subject, event) => {
        subject.setTimer(now)
        sink.collect(subject, new TextEncoder().encode("test-output"));
      }
    });
  });
  
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
    ],
    watermark: timestampFromDate(now),
  });
  
  const response = await client.processEventBatch(request);
  
  expect(response.keyResults).toEqual([
    expect.objectContaining({
      key: new TextEncoder().encode("test-key"),
      newTimers: [timestampFromDate(now)]
    })
  ]);
  
  expect(response.sinkRequests).toEqual([create(pb.SinkRequestSchema, {
    id: "test-sink",
    value: new TextEncoder().encode("test-output")
  })]);
});

test('Process Timer Expired', async () => {
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    return new TestHandler({
      onTimerExpired: (subject, timer) => {
        sink.collect(subject, new TextEncoder().encode("timer-output"));
      }
    });
  });
  
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
    ],
    watermark: timestampFromDate(now),
  });
  
  // Call the server
  const response = await client.processEventBatch(request);
  
  // Consolidated assertions for both length and content
  expect(response.keyResults).toEqual([
    expect.objectContaining({
      key: new TextEncoder().encode("test-key")
    })
  ]);
  
  expect(response.sinkRequests).toEqual([create(pb.SinkRequestSchema, {
    id: "test-sink",
    value: new TextEncoder().encode("timer-output")
  })]);
});

// test('Process State Mutations', async () => {
//   // Setup server and client
//   const client = await setupTestServer((op, sink) => {
//     return new TestHandler({
//       onEvent: (subject, event) => {
//         subject.putState('test-state', 
//           new TextEncoder().encode("count"), 
//           new Uint8Array([42])
//         );
//         // Can also collect to sink if needed
//         sink.collect(subject, new TextEncoder().encode("state-updated"));
//       }
//     });
//   });
  
//   const now = new Date();
  
//   // Create the request with an initial state
//   const request = create(pb.ProcessEventBatchRequestSchema, {
//     events: [
//       create(pb.EventSchema, {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("test-key"),
//             timestamp: timestampFromDate(now),
//             value: new TextEncoder().encode("test-input")
//           })
//         }
//       })
//     ],
//     keyStates: [
//       create(pb.KeyStateSchema, {
//         key: new TextEncoder().encode("test-key"),
//         stateEntryNamespaces: [
//           create(pb.StateEntryNamespaceSchema, {
//             namespace: "test-state",
//             entries: [
//               create(pb.StateEntrySchema, {
//                 key: new TextEncoder().encode("count"),
//                 value: new Uint8Array([0]) // Initial value of 0
//               })
//             ]
//           })
//         ]
//       })
//     ],
//     watermark: timestampFromDate(now)
//   });
  
//   // Call the server
//   const response = await client.processEventBatch(request);
  
//   // Validate the response structure
//   expect(response.keyResults.length).toBe(1);
  
//   // Verify key result has state mutations
//   const keyResult = response.keyResults[0];
//   expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
//   expect(keyResult.stateMutationNamespaces.length).toBe(1);
  
//   // Verify namespace and mutation
//   const namespace = keyResult.stateMutationNamespaces[0];
//   expect(namespace.namespace).toBe("test-state");
//   expect(namespace.mutations.length).toBe(1);
  
//   // Verify it's a put mutation with the correct value
//   const mutation = namespace.mutations[0];
//   expect(mutation.mutation.case).toBe("put");
//   if (mutation.mutation.case === "put") {
//     expect(Buffer.from(mutation.mutation.value.key).toString()).toBe("count");
//     expect(mutation.mutation.value.value[0]).toBe(42);
//   }
// });

// test('Process Multiple Events With State', async () => {
//   // Setup server and client
//   const client = await setupTestServer((op, sink) => {
//     return new TestHandler({
//       onEvent: (subject, event) => {
//         const counterKey = new TextEncoder().encode("counter");
//         const counter = subject.state.get('test-state', counterKey)?.at(0) || 0;
//         subject.putState('test-state', counterKey, new Uint8Array([counter + 1]));
//         sink.collect(subject, new TextEncoder().encode(`incremented-to-${counter + 1}`));
//       }
//     });
//   });
  
//   const now = new Date();
  
//   const request = create(pb.ProcessEventBatchRequestSchema, {
//     events: [
//       {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("key-1"),
//             timestamp: timestampFromDate(now),
//           })
//         }
//       },
//       {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("key-2"),
//             timestamp: timestampFromDate(now),
//           })
//         }
//       }
//     ],
//     keyStates: [
//       {
//         key: new TextEncoder().encode("key-1"),
//         stateEntryNamespaces: [
//           {
//             namespace: "test-state",
//             entries: [
//               {
//                 key: new TextEncoder().encode("counter"),
//                 value: new Uint8Array([1])
//               }
//             ]
//           }
//         ]
//       },
//       {
//         key: new TextEncoder().encode("key-2"),
//         stateEntryNamespaces: [
//           {
//             namespace: "test-state",
//             entries: [
//               {
//                 key: new TextEncoder().encode("counter"),
//                 value: new Uint8Array([2])
//               }
//             ]
//           }
//         ]
//       }
//     ],
//     watermark: timestampFromDate(now)
//   });
  
//   const response = await client.processEventBatch(request);
  
//   expect(response.keyResults.length).toBe(2);
//   expect(response.sinkRequests.length).toBe(2);
  
//   // Results can be in any order, so sort by key for comparison
//   response.keyResults.sort((a, b) => Buffer.compare(a.key, b.key));
  
//   // Verify key-1 result
//   const key1Result = response.keyResults[0];
//   expect(Buffer.from(key1Result.key).toString()).toBe("key-1");
//   expect(key1Result.stateMutationNamespaces.length).toBe(1);
//   expect(key1Result.stateMutationNamespaces[0].namespace).toBe("test-state");
//   expect(key1Result.stateMutationNamespaces[0].mutations[0].mutation.case).toBe("put");
//   if (key1Result.stateMutationNamespaces[0].mutations[0].mutation.case === "put") {
//     expect(Buffer.from(key1Result.stateMutationNamespaces[0].mutations[0].mutation.value.key).toString()).toBe("counter");
//     expect(key1Result.stateMutationNamespaces[0].mutations[0].mutation.value.value[0]).toBe(2);
//   }
  
//   // Verify key-2 result
//   const key2Result = response.keyResults[1];
//   expect(Buffer.from(key2Result.key).toString()).toBe("key-2");
//   expect(key2Result.stateMutationNamespaces[0].mutations[0].mutation.case).toBe("put");
//   if (key2Result.stateMutationNamespaces[0].mutations[0].mutation.case === "put") {
//     expect(Buffer.from(key2Result.stateMutationNamespaces[0].mutations[0].mutation.value.key).toString()).toBe("counter");
//     expect(key2Result.stateMutationNamespaces[0].mutations[0].mutation.value.value[0]).toBe(3);
//   }
  
//   // Sort sink requests by subject key for deterministic comparison
//   const sinkRequests = response.sinkRequests.sort((a, b) => a.id.localeCompare(b.id));
//   expect(sinkRequests.length).toBe(2);
//   expect(sinkRequests[0].id).toBe("test-sink");
//   expect(sinkRequests[1].id).toBe("test-sink");
// });

test('Process Empty Request', async () => {
  // Setup server and client with sink parameter
  const client = await setupTestServer((op, sink) => {
    return new TestHandler();
  });
  
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [],
    watermark: timestampFromDate(now)
  });
  const response = await client.processEventBatch(request);
  
  expect(response).toEqual(create(pb.ProcessEventBatchResponseSchema, {
    keyResults: [],
    sinkRequests: []
  }));
});

test('Process Mixed Event Types', async () => {
  // Setup server and client with sink parameter
  const client = await setupTestServer((op, sink) => {
    return new TestHandler({
      onEvent: (subject, event) => {
        // Use the standard sink instead of subject.emit
        sink.collect(subject, new TextEncoder().encode("keyed-output"));
      },
      onTimerExpired: (subject, timer) => {
        // Use the standard sink instead of subject.emit
        sink.collect(subject, new TextEncoder().encode("timer-output"));
      }
    });
  });
  
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: 'keyedEvent',
          value: create(pb.KeyedEventSchema, {
            key: new TextEncoder().encode("test-key"),
            timestamp: timestampFromDate(now),
            value: new TextEncoder().encode("test-input"),
          })
        }
      },
      {
        event: {
          case: 'timerExpired',
          value: create(pb.TimerExpiredSchema, {
            key: new TextEncoder().encode("test-key"),
            timestamp: timestampFromDate(now),
          })
        }
      }
    ],
    watermark: timestampFromDate(now)
  });
  
  const response = await client.processEventBatch(request);
  
  expect(response.keyResults).toEqual([
    expect.objectContaining({
      key: new TextEncoder().encode("test-key")
    })
  ]);
  
  // Verify sink requests (order should be preserved)
  expect(response.sinkRequests).toEqual([
    create(pb.SinkRequestSchema, {
      id: "test-sink",
      value: new TextEncoder().encode("keyed-output")
    }),
    create(pb.SinkRequestSchema, {
      id: "test-sink",
      value: new TextEncoder().encode("timer-output")
    })
  ]);
});

// test('Drop Value State', async () => {
//   const now = new Date();
  
//   const client = await setupTestServer((op, sink) => {
//     const countSpec = new ValueSpec(op, 'count', new UInt64Codec(), 0);
//     return new TestHandler({
//       onEvent: (subject, event) => {
//         const stateKey = new TextEncoder().encode("test-value");
//         const counter = countSpec.stateFor(subject);
//         // Optionally use sink here if needed
//         sink.collect(subject, new TextEncoder().encode("value-state-processed"));
//       }
//     });
//   });
  
//   const request = create(pb.ProcessEventBatchRequestSchema, {
//     events: [
//       {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("test-key"),
//             timestamp: timestampFromDate(now),
//             value: new TextEncoder().encode("test-input"),
//           })
//         }
//       }
//     ],
//     keyStates: [
//       {
//         key: new TextEncoder().encode("test-key"),
//         stateEntryNamespaces: [
//           {
//             namespace: "test-value",
//             entries: [
//               {
//                 value: new Uint8Array([42]), // Initial value
//               }
//             ]
//           }
//         ]
//       }
//     ],
//     watermark: timestampFromDate(now)
//   });
  
//   const response = await client.processEventBatch(request);
  
//   expect(response.keyResults.length).toBe(1);
//   const keyResult = response.keyResults[0];
//   expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
//   expect(keyResult.stateMutationNamespaces.length).toBe(1);
  
//   const namespace = keyResult.stateMutationNamespaces[0];
//   expect(namespace.namespace).toBe("test-value");
//   expect(namespace.mutations.length).toBe(1);
//   expect(namespace.mutations[0].mutation.case).toBe("delete");
  
//   if (namespace.mutations[0].mutation.case === "delete") {
//     expect(Buffer.from(namespace.mutations[0].mutation.value.key).toString()).toBe("test-value");
//   }
  
//   // Verify sink request
//   expect(response.sinkRequests.length).toBe(1);
//   expect(response.sinkRequests[0].id).toBe("test-sink");
//   expect(Buffer.from(response.sinkRequests[0].value).toString()).toBe("value-state-processed");
// });

// test('Increment Value State', async () => {
//   const now = new Date();
  
//   // Setup server and client with sink parameter
//   const client = await setupTestServer((op, sink) => {
//     return new TestHandler({
//       onEvent: (subject, event) => {
//         const stateKey = new TextEncoder().encode("counter-state");
//         const counter = subject.state.get('counter-state', stateKey)?.at(0) || 0;
//         subject.putState('counter-state', stateKey, new Uint8Array([counter + 1]));
//         sink.collect(subject, new TextEncoder().encode(`counter-incremented-to-${counter + 1}`));
//       }
//     });
//   });
  
//   const request = create(pb.ProcessEventBatchRequestSchema, {
//     events: [
//       {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("test-key"),
//           })
//         }
//       },
//       {
//         event: {
//           case: 'keyedEvent',
//           value: create(pb.KeyedEventSchema, {
//             key: new TextEncoder().encode("test-key"),
//           })
//         }
//       }
//     ],
//     watermark: timestampFromDate(now)
//   });
  
//   const response = await client.processEventBatch(request);
  
//   expect(response.keyResults.length).toBe(1);
//   const keyResult = response.keyResults[0];
//   expect(Buffer.from(keyResult.key).toString()).toBe("test-key");
//   expect(keyResult.stateMutationNamespaces.length).toBe(1);
  
//   const namespace = keyResult.stateMutationNamespaces[0];
//   expect(namespace.namespace).toBe("counter-state");
//   expect(namespace.mutations.length).toBe(1);
//   expect(namespace.mutations[0].mutation.case).toBe("put");
  
//   if (namespace.mutations[0].mutation.case === "put") {
//     expect(Buffer.from(namespace.mutations[0].mutation.value.key).toString()).toBe("counter-state");
//     expect(namespace.mutations[0].mutation.value.value[0]).toBe(2);
//   }
  
//   // Verify the sink requests
//   expect(response.sinkRequests.length).toBe(2);
//   expect(response.sinkRequests[0].id).toBe("test-sink");
//   expect(Buffer.from(response.sinkRequests[0].value).toString()).toBe("counter-incremented-to-1");
//   expect(response.sinkRequests[1].id).toBe("test-sink");
//   expect(Buffer.from(response.sinkRequests[1].value).toString()).toBe("counter-incremented-to-2");
// });

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
async function setupTestServer(handler: (op: topology.Operator, sink: stdio.Sink) => TestHandler): Promise<Client<typeof pb.Handler>> {
  const job = new Job({
    workerCount: 1,
    workingStorageLocation: '/tmp/reduction',
  });
  const sink = new stdio.Sink(job, 'test-sink');
  const source = new stdio.Source(job, 'test-source', {
    keyEvent: (event) => {
      throw new Error('Key event not expected in this test');
    }
  });
  const operator = new topology.Operator(job, 'test-operator', {
    parallelism: 1,
    handler: (op) => handler(op, sink),
  });
  source.connect(operator);
  operator.connect(sink);

  const synthesizedHandler = job.context.synthesize().handler;
  const port = await new Server(synthesizedHandler, 0).start();

  const client = createClient(pb.Handler, createConnectTransport({
    baseUrl: `http://localhost:${port}`,
    httpVersion: "1.1"
  }));

  return client;
}
