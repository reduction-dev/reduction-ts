import { create } from "@bufbuild/protobuf";
import type { StateEntry } from "@rxn/handler/subject-context";
import * as pb from "@rxn/proto/handlerpb/handler_pb";
import { expect, test } from "bun:test";
import { BoolCodec as BooleanCodec, FloatCodec, Int32Codec, StringCodec } from "./scalar-codecs";
import type { ValueCodec } from "./value-codec";
import { ValueState } from "./value-state";

test("ValueState with number", () => {
  const state = testValueStateRoundTrip("test-number", 42, new Int32Codec, 0);
  expect(state.getValue()).toBe(42);
});

test("ValueState with string", () => {
  const state = testValueStateRoundTrip("test-string", "hello world", new StringCodec, "");
  expect(state.getValue()).toBe("hello world");
});

test("ValueState with boolean", () => {
  const state = testValueStateRoundTrip("test-boolean", true, new BooleanCodec, false);
  expect(state.getValue()).toBe(true);
});

test("ValueState with decimal number", () => {
  const state = testValueStateRoundTrip("test-float", 3.14159, new FloatCodec, 0);
  expect(state.getValue()).toBeCloseTo(3.14159, 2);
});

test("ValueState name test", () => {
  const state = new ValueState("test-name", new Int32Codec, 0, []);
  expect(state.getName()).toBe("test-name");
});

test("ValueState drop test", () => {
  // Initialize value state with a value
  const initialValue = 42;
  const entries: StateEntry[] = [
    { key: Buffer.from("test-drop"), value: new Int32Codec().encode(initialValue) }
  ];
  
  const state = new ValueState("test-drop", new Int32Codec(), 0, entries);
  expect(state.getValue()).toBe(initialValue);
  
  // Drop the value
  state.drop();
  
  const mutations = state.mutations();

  // Verify mutations contain a delete mutation
  expect(mutations).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "delete",
        value: {
          key: Buffer.from("test-drop"),
        },
      },
    }),
  ]);
  
  // Better assertion using create
  expect(mutations).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "delete",
        value: {
          key: Buffer.from("test-drop"),
        },
      },
    }),
  ]);
  
  // Verify value is reset to default
  expect(state.getValue()).toBe(0);
});

test("ValueState increment multiple events", () => {
  // Initialize state
  const state = new ValueState("test-counter", new Int32Codec, 0, []);
  
  // First event - increment from 0 to 1
  state.setValue(state.getValue() + 1);
  expect(state.getValue()).toBe(1);
  
  // Second event - increment from 1 to 2
  state.setValue(state.getValue() + 1);
  expect(state.getValue()).toBe(2);
  
  // Verify mutations reflect the final value
  const mutations = state.mutations();
  expect(mutations).toHaveLength(1);
  
  expect(mutations).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "put",
        value: {
          key: Buffer.from("test-counter"),
          value: new Int32Codec().encode(2),
        },
      },
    }),
  ]);
});

// Helper function that tests the complete round-trip of a ValueState
function testValueStateRoundTrip<T>(name: string, testValue: T, codec: ValueCodec<T>, defaultValue: T) {
  // Initialize first value with empty state
  const v1 = new ValueState(name, codec, defaultValue, []);
  
  // Set value and get mutations
  v1.setValue(testValue);
  expect(v1.mutations()).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "put",
        value: {
          key: Buffer.from(name),
          value: codec.encode(testValue),
        },
      },
    }),
  ])

  // We can't directly extract the mutation value in TypeScript as in Go,
  // so we'll create a new StateEntry from the mutation
  const putMutation = v1.mutations()[0].mutation.value as pb.PutMutation;
  const entries: StateEntry[] = [
    { key: putMutation.key, value: putMutation.value }
  ];
  
  // Initialize second value with mutation data
  const v2 = new ValueState(name, codec, defaultValue, entries);
  
  // Verify values match
  if (typeof testValue === 'number' && typeof v2.getValue() === 'number') {
    expect(v2.getValue()).toBeCloseTo(testValue, 2); // Within 0.01 of testValue
  } else {
    expect(v2.getValue()).toEqual(testValue);
  }
  
  return v2;
}
