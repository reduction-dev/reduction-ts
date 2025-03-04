import { create } from "@bufbuild/protobuf";
import * as pb from "../proto/handlerpb/handler_pb";
import { test, expect } from "bun:test";
import { BooleanValueCodec, FloatValueCodec, Int32ValueCodec, StringValueCodec } from "./scalar-codecs";
import type { ValueCodec } from "./value-codec";
import { ValueState } from "./value-state";

test("ValueState with number", () => {
  const state = testValueStateRoundTrip("test-number", 42, new Int32ValueCodec, 0);
  expect(state.value).toBe(42);
});

test("ValueState with string", () => {
  const state = testValueStateRoundTrip("test-string", "hello world", new StringValueCodec, "");
  expect(state.value).toBe("hello world");
});

test("ValueState with boolean", () => {
  const state = testValueStateRoundTrip("test-boolean", true, new BooleanValueCodec, false);
  expect(state.value).toBe(true);
});

test("ValueState with decimal number", () => {
  const state = testValueStateRoundTrip("test-float", 3.14159, new FloatValueCodec, 0);
  expect(state.value).toBeCloseTo(3.14159, 2);
});

test("ValueState name test", () => {
  const state = new ValueState("test-name", new Int32ValueCodec, 0, []);
  expect(state.name).toBe("test-name");
});

test("ValueState drop test", () => {
  // Initialize value state with a value
  const initialValue = 42;
  const entries = [
    create(pb.StateEntrySchema, {
      key: Buffer.from("test-drop"),
      value: new Int32ValueCodec().encode(initialValue)
    })
  ];
  
  const state = new ValueState("test-drop", new Int32ValueCodec(), 0, entries);
  expect(state.value).toBe(initialValue);
  
  // Drop the value
  state.drop();
  
  // Verify mutations contain a delete mutation with the correct structure
  expect(state.mutations()).toEqual([
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
  expect(state.value).toBe(0);
});

test("ValueState increment multiple events", () => {
  // Initialize state
  const state = new ValueState("test-counter", new Int32ValueCodec, 0, []);
  
  // First event - increment from 0 to 1, then from 1 to 2
  state.setValue(state.value + 1);
  state.setValue(state.value + 1);
  
  // Verify final value and mutations
  expect(state.value).toBe(2);
  expect(state.mutations()).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "put",
        value: {
          key: Buffer.from("test-counter"),
          value: new Int32ValueCodec().encode(2),
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
  ]);

  // We can't directly extract the mutation value in TypeScript as in Go,
  // so we'll create a new StateEntry from the mutation
  const putMutation = v1.mutations()[0].mutation.value as pb.PutMutation;
  const entries = [
    create(pb.StateEntrySchema, {
      key: putMutation.key,
      value: putMutation.value
    })
  ];
  
  // Initialize second value with mutation data and verify round trip
  const v2 = new ValueState(name, codec, defaultValue, entries);
  
  // Verify values match based on type
  if (typeof testValue === 'number' && typeof v2.value === 'number') {
    expect(v2.value).toBeCloseTo(testValue, 2); // Within 0.01 of testValue
  } else {
    expect(v2.value).toEqual(testValue);
  }
  
  return v2;
}
