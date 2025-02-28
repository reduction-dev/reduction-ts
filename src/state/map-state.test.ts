import { describe, expect, test } from "bun:test";
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
  // Test initial empty map
  const state = new MapState("test", codec, []);
  expect(state.size).toBe(0);

  // Test after adding items
  state.put("k1", "v1");
  state.put("k2", "v2");
  expect(state.size).toBe(2);

  // Test loaded state with initial entries
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

  // Test updating existing items doesn't change size
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

const textEncoder = new TextEncoder();

// String codec implementation for testing, now using Uint8Array
const codec: MapCodec<string, string> = {
  encodeKey(key: string): Uint8Array {
    return Buffer.from(key);
  },
  decodeKey(data: Uint8Array): string {
    return Buffer.from(data).toString();
  },
  encodeValue(value: string): Uint8Array {
    return Buffer.from(value);
  },
  decodeValue(data: Uint8Array): string {
    return Buffer.from(data).toString();
  }
};

// Add benchmark testing for entries() performance
describe("MapState entries() benchmark", () => {
  // Test parameters
  const SMALL_SIZE = 100;
  const MEDIUM_SIZE = 1000;
  const LARGE_SIZE = 10000;
  
  // Helper to create a state with n entries
  function createStateWithEntries(size: number, updatePercentage = 0, deletePercentage = 0): MapState<string, string> {
    // Create initial entries
    const entries: pb.StateEntry[] = Array.from({ length: size }, (_, i) => {
      const key = `key-${i}`;
      const value = `value-${i}`;
      return create(pb.StateEntrySchema, {
        key: textEncoder.encode(key),
        value: textEncoder.encode(value)
      });
    });
    
    const state = new MapState<string, string>("benchmark", codec, entries);
    
    // Apply updates
    const updateCount = Math.floor(size * updatePercentage);
    for (let i = 0; i < updateCount; i++) {
      const key = `key-${i}`; // Update from the start
      state.put(key, `updated-${i}`);
    }
    
    // Apply deletes
    const deleteCount = Math.floor(size * deletePercentage);
    const deleteStart = size - deleteCount;
    for (let i = deleteStart; i < size; i++) {
      const key = `key-${i}`; // Delete from the end
      state.delete(key);
    }
    
    // Add new entries (not in original)
    const newCount = Math.floor(size * updatePercentage); // Same number as updates
    for (let i = 0; i < newCount; i++) {
      const key = `new-key-${i}`;
      state.put(key, `new-value-${i}`);
    }
    
    return state;
  }
  
  // Test entries() performance with different dataset sizes
  test("entries() performance with different sizes", () => {
    console.log("\nBenchmarking entries() with different dataset sizes:");
    
    // Small dataset
    let state = createStateWithEntries(SMALL_SIZE);
    let start = performance.now();
    let results = Array.from(state.entries());
    let elapsed = performance.now() - start;
    console.log(`  Small (${SMALL_SIZE} entries): ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // Medium dataset
    state = createStateWithEntries(MEDIUM_SIZE);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  Medium (${MEDIUM_SIZE} entries): ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // Large dataset
    state = createStateWithEntries(LARGE_SIZE);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  Large (${LARGE_SIZE} entries): ${elapsed.toFixed(2)}ms, ${results.length} results`);
  });
  
  // Test entries() with different update patterns
  test("entries() performance with different update patterns", () => {
    console.log("\nBenchmarking entries() with different update patterns:");
    
    // No updates
    let state = createStateWithEntries(MEDIUM_SIZE, 0, 0);
    let start = performance.now();
    let results = Array.from(state.entries());
    let elapsed = performance.now() - start;
    console.log(`  No updates: ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // 10% updates, no deletes
    state = createStateWithEntries(MEDIUM_SIZE, 0.1, 0);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  10% updates, no deletes: ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // 50% updates, no deletes
    state = createStateWithEntries(MEDIUM_SIZE, 0.5, 0);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  50% updates, no deletes: ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // 10% updates, 10% deletes
    state = createStateWithEntries(MEDIUM_SIZE, 0.1, 0.1);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  10% updates, 10% deletes: ${elapsed.toFixed(2)}ms, ${results.length} results`);
    
    // 50% updates, 50% deletes
    state = createStateWithEntries(MEDIUM_SIZE, 0.5, 0.5);
    start = performance.now();
    results = Array.from(state.entries());
    elapsed = performance.now() - start;
    console.log(`  50% updates, 50% deletes: ${elapsed.toFixed(2)}ms, ${results.length} results`);
  });
  
  // Test multiple iterations of entries() to measure average performance
  test("entries() average performance", () => {
    const ITERATIONS = 10;
    console.log(`\nBenchmarking entries() average over ${ITERATIONS} iterations:`);
    
    // Create state once
    const state = createStateWithEntries(MEDIUM_SIZE, 0.2, 0.1);
    
    // Run multiple iterations
    let totalElapsed = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      const _ = Array.from(state.entries());
      const elapsed = performance.now() - start;
      totalElapsed += elapsed;
    }
    
    const averageElapsed = totalElapsed / ITERATIONS;
    console.log(`  Average time: ${averageElapsed.toFixed(2)}ms`);
  });
});
