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

test('Process State Mutations', async () => {
  const codec = new StringUintMapCodec();
  // Setup server and client
  const client = await setupTestServer((op, sink) => {
    const spec = new topology.MapSpec(op, 'test-state', codec);
    return new TestHandler({
      onEvent: (subject, event) => {
        const count = spec.stateFor(subject);
        count.put("test-key", 42);
      }
    });
  });

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
            value: new TextEncoder().encode("test-value")
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
                value: codec.encodeValue(0),
              })
            ]
          })
        ]
      })
    ],
    watermark: timestampFromDate(now)
  });

  // Call the server
  const response = await client.processEventBatch(request);

  expect(response.keyResults).toEqual([create(pb.KeyResultSchema, {
    key: new TextEncoder().encode("test-key"),
    stateMutationNamespaces: [{
      namespace: "test-state",
      mutations: [{
        mutation: {
          case: "put",
          value: create(pb.PutMutationSchema, {
            key: new TextEncoder().encode("test-key"),
            value: codec.encodeValue(42)
          })
        }
      }]
    }]
  })]);
});

test('Process Multiple Events With State', async () => {
  const codec = new StringUintMapCodec();

  const client = await setupTestServer((op, sink) => {
    const spec = new topology.MapSpec(op, 'count-state', codec);
    return new TestHandler({
      onEvent: (subject, event) => {
        const counts = spec.stateFor(subject);
        const currentValue = counts.get("counter") ?? 0;
        counts.put("counter", currentValue + 1);
      }
    });
  });

  const request = create(pb.ProcessEventBatchRequestSchema, {
    events: [
      create(pb.EventSchema, {
        event: {
          case: 'keyedEvent',
          value: create(pb.KeyedEventSchema, {
            key: Buffer.from("key-1"),
            timestamp: timestampFromDate(now),
          })
        }
      }),
      create(pb.EventSchema, {
        event: {
          case: 'keyedEvent',
          value: create(pb.KeyedEventSchema, {
            key: Buffer.from("key-2"),
            timestamp: timestampFromDate(now),
          })
        }
      })
    ],
    keyStates: [
      create(pb.KeyStateSchema, {
        key: new TextEncoder().encode("key-1"),
        stateEntryNamespaces: [{
          namespace: "count-state",
          entries: [{
            key: new TextEncoder().encode("counter"),
            value: codec.encodeValue(1)
          }]
        }]
      }),
      create(pb.KeyStateSchema, {
        key: new TextEncoder().encode("key-2"),
        stateEntryNamespaces: [{
            namespace: "count-state",
            entries: [{
              key: new TextEncoder().encode("counter"),
              value: codec.encodeValue(2)
          }]
        }]
      })
    ],
    watermark: timestampFromDate(now)
  });

  const response = await client.processEventBatch(request);

  // Sort results for deterministic comparison. It's ok for results for keys to
  // arrive in any order.
  response.keyResults.sort((a, b) => Buffer.compare(a.key, b.key));

  expect(response.keyResults).toEqual([
    create(pb.KeyResultSchema, {
      key: new TextEncoder().encode("key-1"),
      stateMutationNamespaces: [{
        namespace: "count-state",
        mutations: [{
          mutation: {
            case: "put",
            value: create(pb.PutMutationSchema, {
              key: new TextEncoder().encode("counter"),
              value: codec.encodeValue(2)
            })
          }
        }]
      }]
    }),
    create(pb.KeyResultSchema, {
      key: new TextEncoder().encode("key-2"),
      stateMutationNamespaces: [{
        namespace: "count-state",
        mutations: [{
          mutation: {
            case: "put",
            value: create(pb.PutMutationSchema, {
              key: new TextEncoder().encode("counter"),
              value: codec.encodeValue(3)
            })
          }
        }]
      }]
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
class TestHandler implements OperatorHandler {
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

class StringUintMapCodec {
  encodeKey(key: string): Uint8Array {
    return Buffer.from(key);
  }

  decodeKey(data: Uint8Array): string {
    return Buffer.from(data).toString();
  }

  encodeValue(value: number): Uint8Array {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, value);
    return new Uint8Array(buffer);
  }

  decodeValue(data: Uint8Array): number {
    return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0);
  }
}
