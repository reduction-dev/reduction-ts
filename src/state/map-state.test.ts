import { expect, test } from "bun:test";
import { MapState } from "./map-state";
import type { MapCodec } from "./map-codec";
import * as pb from "@rxn/proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";

test("MapState name test", () => {
  const state = new MapState("test-name", codec, []);
  expect(state.name).toBe("test-name");
});

test("MapState put mutation", () => {
  const state = new MapState("id", codec, []);
  state.put("k1", "v1");

  expect(state.mutations()).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "put",
        value: {
          key: textEncoder.encode("k1"),
          value: textEncoder.encode("v1")
        },
      },
    }),
  ]);
});

test("MapState delete mutation", () => {
  const state = new MapState("id", codec, [
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("k1"),
      value: textEncoder.encode("v1")
    })
  ]);
  state.delete("k1");

  expect(state.mutations()).toEqual([
    create(pb.StateMutationSchema, {
      mutation: {
        case: "delete",
        value: {
          key: textEncoder.encode("k1")
        },
      },
    }),
  ]);
});

test("MapState entries test", () => {
  const initialEntries = [
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("unchanged"),
      value: textEncoder.encode("unchanged")
    }),
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("modified"),
      value: textEncoder.encode("to-be-modified")
    }),
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("deleted"),
      value: textEncoder.encode("to-be-deleted")
    })
  ];

  const state = new MapState("id", codec, initialEntries);
  state.put("added", "added");
  state.put("modified", "modified");
  state.delete("deleted");

  const entries = Object.fromEntries(state.entries());
  expect(entries).toEqual({
    unchanged: "unchanged",
    modified: "modified",
    added: "added"
  });
});

test("MapState size operations", () => {
  // Test empty map
  const state = new MapState("test", codec, []);
  expect(state.size).toBe(0);

  // Test after adding items
  state.put("k1", "v1");
  state.put("k2", "v2");
  expect(state.size).toBe(2);

  // Test after loading items
  const loadedState = new MapState("test", codec, [
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("k1"),
      value: textEncoder.encode("v1")
    }),
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("k2"),
      value: textEncoder.encode("v2")
    })
  ]);
  expect(loadedState.size).toBe(2);

  // Test after deleting items
  loadedState.delete("k1");
  expect(loadedState.size).toBe(1);

  // Test updating existing items
  const updateState = new MapState("test", codec, []);
  updateState.put("k1", "v1");
  updateState.put("k1", "v2"); // update same key
  expect(updateState.size).toBe(1);

  // Test delete then add same key
  const readdState = new MapState("test", codec, [
    create(pb.StateEntrySchema, {
      key: textEncoder.encode("k1"),
      value: textEncoder.encode("v1")
    })
  ]);
  readdState.delete("k1");
  readdState.put("k1", "v2");
  expect(readdState.size).toBe(1);
});

// For string encoding/decoding
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// String codec implementation for testing, now using Uint8Array
const codec: MapCodec<string, string> = {
  encodeKey(key: string): Uint8Array {
    return textEncoder.encode(key);
  },
  decodeKey(data: Uint8Array): string {
    return textDecoder.decode(data);
  },
  encodeValue(value: string): Uint8Array {
    return textEncoder.encode(value);
  },
  decodeValue(data: Uint8Array): string {
    return textDecoder.decode(data);
  }
};
