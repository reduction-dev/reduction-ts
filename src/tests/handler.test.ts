import { create } from "@bufbuild/protobuf";
import { type Client, createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { expect, test } from "bun:test";
import * as stdio from "../connectors/stdio";
import type { Subject } from "../handler/subject";
import * as pb from "../proto/handlerpb/handler_pb";
import { Server } from "../server/server";
import { stringValueCodec, uint64ValueCodec } from "../state/scalar-codecs";
import * as topology from "../topology";
import { Job } from "../topology/job";
import type { KeyedEvent, OperatorHandler } from "../types";
import { MapCodec } from "../state";
import { Temporal, instantToProto } from "../temporal";

const now = Temporal.Instant.from("2025-01-01T00:00:00Z");

test("Process Keyed Event", async () => {
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    return new TestHandler({
      onEvent: (subject, event) => {
        subject.setTimer(now);
        sink.collect(subject, new TextEncoder().encode("test-output"));
      },
    });
  });

  // Create the request with a keyed event
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "keyedEvent",
          value: {
            key: new TextEncoder().encode("test-key"),
            timestamp: instantToProto(now),
            value: new TextEncoder().encode("test-input"),
          },
        },
      },
    ],
    watermark: instantToProto(now),
  });

  const response = await client.processEventBatch(request);

  expect(response.keyResults).toEqual([
    expect.objectContaining({
      key: new TextEncoder().encode("test-key"),
      newTimers: [instantToProto(now)],
    }),
  ]);

  expect(response.sinkRequests).toEqual([
    create(pb.SinkRequestSchema, {
      id: "test-sink",
      value: new TextEncoder().encode("test-output"),
    }),
  ]);
});

test("Process Timer Expired", async () => {
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    return new TestHandler({
      onTimerExpired: (subject, timer) => {
        sink.collect(subject, new TextEncoder().encode("timer-output"));
      },
    });
  });

  // Create the request with a timer expired event
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "timerExpired",
          value: {
            key: new TextEncoder().encode("test-key"),
            timestamp: instantToProto(now),
          },
        },
      },
    ],
    watermark: instantToProto(now),
  });

  // Call the server
  const response = await client.processEventBatch(request);

  // Consolidated assertions for both length and content
  expect(response.keyResults).toEqual([
    expect.objectContaining({
      key: new TextEncoder().encode("test-key"),
    }),
  ]);

  expect(response.sinkRequests).toEqual([
    create(pb.SinkRequestSchema, {
      id: "test-sink",
      value: new TextEncoder().encode("timer-output"),
    }),
  ]);
});

test("Process State Mutations", async () => {
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    const spec = new topology.MapSpec(op, "test-state", stringUintMapCodec);
    return new TestHandler({
      onEvent: (subject, event) => {
        const count = spec.stateFor(subject);
        count.set("test-key", 42);
      },
    });
  });

  // Create the request with an initial state
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "keyedEvent",
          value: {
            key: new TextEncoder().encode("test-key"),
            timestamp: instantToProto(now),
            value: new TextEncoder().encode("test-value"),
          },
        },
      },
    ],
    keyStates: [
      {
        key: new TextEncoder().encode("test-key"),
        stateEntryNamespaces: [
          {
            namespace: "test-state",
            entries: [
              {
                key: new TextEncoder().encode("count"),
                value: stringUintMapCodec.encodeValue(0),
              },
            ],
          },
        ],
      },
    ],
    watermark: instantToProto(now),
  });

  // Call the server
  const response = await client.processEventBatch(request);

  expect(response.keyResults).toEqual([
    create(pb.KeyResultSchema, {
      key: new TextEncoder().encode("test-key"),
      stateMutationNamespaces: [
        {
          namespace: "test-state",
          mutations: [
            {
              mutation: {
                case: "put",
                value: {
                  key: stringUintMapCodec.encodeKey("test-key"),
                  value: stringUintMapCodec.encodeValue(42),
                },
              },
            },
          ],
        },
      ],
    }),
  ]);
});

test("Process Multiple Events With State", async () => {
  const client = await setupTestServer((op, sink) => {
    const spec = new topology.MapSpec(op, "count-state", stringUintMapCodec);
    return new TestHandler({
      onEvent: (subject, event) => {
        const counts = spec.stateFor(subject);
        const currentValue = counts.get("counter") ?? 0;
        counts.set("counter", currentValue + 1);
      },
    });
  });

  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "keyedEvent",
          value: {
            key: Buffer.from("key-1"),
            timestamp: instantToProto(now),
          },
        },
      },
      {
        event: {
          case: "keyedEvent",
          value: {
            key: Buffer.from("key-2"),
            timestamp: instantToProto(now),
          },
        },
      },
    ],
    keyStates: [
      {
        key: Buffer.from("key-1"),
        stateEntryNamespaces: [
          {
            namespace: "count-state",
            entries: [
              {
                key: stringUintMapCodec.encodeKey("counter"),
                value: stringUintMapCodec.encodeValue(1),
              },
            ],
          },
        ],
      },
      {
        key: Buffer.from("key-2"),
        stateEntryNamespaces: [
          {
            namespace: "count-state",
            entries: [
              {
                key: stringUintMapCodec.encodeKey("counter"),
                value: stringUintMapCodec.encodeValue(2),
              },
            ],
          },
        ],
      },
    ],
    watermark: instantToProto(now),
  });

  const response = await client.processEventBatch(request);

  // Sort results for deterministic comparison. It's ok for results for keys to
  // arrive in any order.
  response.keyResults.sort((a, b) => Buffer.compare(a.key, b.key));

  expect(response.keyResults).toEqual([
    create(pb.KeyResultSchema, {
      key: Buffer.from("key-1"),
      stateMutationNamespaces: [
        {
          namespace: "count-state",
          mutations: [
            {
              mutation: {
                case: "put",
                value: {
                  key: stringUintMapCodec.encodeKey("counter"),
                  value: stringUintMapCodec.encodeValue(2),
                },
              },
            },
          ],
        },
      ],
    }),
    create(pb.KeyResultSchema, {
      key: Buffer.from("key-2"),
      stateMutationNamespaces: [
        {
          namespace: "count-state",
          mutations: [
            {
              mutation: {
                case: "put",
                value: {
                  key: stringUintMapCodec.encodeKey("counter"),
                  value: stringUintMapCodec.encodeValue(3),
                },
              },
            },
          ],
        },
      ],
    }),
  ]);
});

test("Drop Value State", async () => {
  // Setup server with ValueSpec
  const client = await setupTestServer((op, sink) => {
    const spec = new topology.ValueSpec(op, "value-state", uint64ValueCodec, 0);
    return new TestHandler({
      onEvent: (subject, event) => {
        const counter = spec.stateFor(subject);
        counter.drop();
      },
    });
  });

  // Create the request with initial state
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "keyedEvent",
          value: {
            key: new TextEncoder().encode("test-key"),
            timestamp: instantToProto(now),
            value: new TextEncoder().encode("test-input"),
          },
        },
      },
    ],
    keyStates: [
      {
        key: new TextEncoder().encode("test-key"),
        stateEntryNamespaces: [
          {
            namespace: "value-state",
            entries: [
              {
                value: uint64ValueCodec.encode(42),
              },
            ],
          },
        ],
      },
    ],
    watermark: instantToProto(now),
  });

  const response = await client.processEventBatch(request);

  // Use compact assertion for key results
  expect(response.keyResults).toEqual([
    create(pb.KeyResultSchema, {
      key: new TextEncoder().encode("test-key"),
      stateMutationNamespaces: [
        {
          namespace: "value-state",
          mutations: [
            {
              mutation: {
                case: "delete",
                value: {
                  key: new TextEncoder().encode("value-state"),
                },
              },
            },
          ],
        },
      ],
    }),
  ]);
});

test("Increment Value State", async () => {
  const client = await setupTestServer((op, sink) => {
    const spec = new topology.ValueSpec(op, "counter-state", uint64ValueCodec, 0);
    return new TestHandler({
      onEvent: (subject, event) => {
        const counter = spec.stateFor(subject);
        counter.setValue(counter.value + 1);
      },
    });
  });

  // Create the request with two events for the same key
  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      {
        event: {
          case: "keyedEvent",
          value: {
            key: Buffer.from("test-key"),
            timestamp: instantToProto(now),
          },
        },
      },
      {
        event: {
          case: "keyedEvent",
          value: {
            key: Buffer.from("test-key"),
            timestamp: instantToProto(now),
          },
        },
      },
    ],
    watermark: instantToProto(now),
  });

  const response = await client.processEventBatch(request);

  expect(response.keyResults).toEqual([
    create(pb.KeyResultSchema, {
      key: new TextEncoder().encode("test-key"),
      stateMutationNamespaces: [
        {
          namespace: "counter-state",
          mutations: [
            {
              mutation: {
                case: "put",
                value: {
                  key: new TextEncoder().encode("counter-state"),
                  value: uint64ValueCodec.encode(2),
                },
              },
            },
          ],
        },
      ],
    }),
  ]);
});

// Test handler implementation for tests
class TestHandler implements OperatorHandler {
  onEventFn?: (subject: Subject, event: KeyedEvent) => void;
  onTimerExpiredFn?: (subject: Subject, timer: Temporal.Instant) => void;

  constructor(
    options: {
      onEvent?: (subject: Subject, event: KeyedEvent) => void;
      onTimerExpired?: (subject: Subject, timer: Temporal.Instant) => void;
    } = {}
  ) {
    this.onEventFn = options.onEvent;
    this.onTimerExpiredFn = options.onTimerExpired;
  }

  onEvent(subject: Subject, event: KeyedEvent): void {
    this.onEventFn?.(subject, event);
  }

  onTimerExpired(subject: Subject, timer: Temporal.Instant): void {
    this.onTimerExpiredFn?.(subject, timer);
  }
}

// Setup function to create a test server and client
async function setupTestServer(
  handler: (op: topology.Operator, sink: stdio.Sink) => TestHandler
): Promise<Client<typeof pb.Handler>> {
  const job = new Job({
    workerCount: 1,
    workingStorageLocation: "/tmp/reduction",
  });
  const sink = new stdio.Sink(job, "test-sink");
  const source = new stdio.Source(job, "test-source", {
    keyEvent: (event) => {
      throw new Error("Key event not expected in this test");
    },
  });
  const operator = new topology.Operator(job, "test-operator", {
    parallelism: 1,
    handler: (op) => handler(op, sink),
  });
  source.connect(operator);
  operator.connect(sink);

  const synthesizedHandler = job.context.synthesize().handler;
  const port = await new Server(synthesizedHandler, 0).start();

  const client = createClient(
    pb.Handler,
    createConnectTransport({
      baseUrl: `http://localhost:${port}`,
      httpVersion: "1.1",
    })
  );

  return client;
}

const stringUintMapCodec = new MapCodec<string, number>({
  keyCodec: stringValueCodec,
  valueCodec: uint64ValueCodec,
});
