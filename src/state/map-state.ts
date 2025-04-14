import * as pb from "../proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";
import type { MapCodec } from "./map-codec";

/**
 * MapState manages a persisted map of key-value pairs.
 *
 * MapStates are created using the {@link topology.MapSpec.stateFor} method.
 *
 * @typeParam K The key type
 * @typeParam V The value type
 */
export class MapState<K, V> {
  #name: string;
  #state: Map<string, V> = new Map();
  #dirtyKeys: Set<string> = new Set();
  #codec: MapCodec<K, V>;

  /**
   * @ignore
   */
  constructor(name: string, codec: MapCodec<K, V>, stateEntries: pb.StateEntry[]) {
    this.#name = name;
    this.#codec = codec;
    this.#loadEntries(stateEntries);
  }

  /**
   * Retrieves a value by its key.
   *
   * @param key The key to look up
   * @returns The value associated with the key, or undefined if not found
   */
  public get(key: K): V | undefined {
    const mapKey = this.#getMapKey(key);
    return this.#state.get(mapKey);
  }

  /**
   * Sets a value for the given key.
   *
   * @param key The key to associate with the value
   * @param value The value to store
   */
  public set(key: K, value: V): void {
    const mapKey = this.#getMapKey(key);
    this.#state.set(mapKey, value);
    this.#dirtyKeys.add(mapKey);
  }

  /**
   * Deletes a key-value pair and marks the key as modified.
   *
   * @param key The key to delete
   */
  public delete(key: K): void {
    const mapKey = this.#getMapKey(key);
    const didRemove = this.#state.delete(mapKey);
    if (didRemove) {
      this.#dirtyKeys.add(mapKey);
    }
  }

  /**
   * Checks if a key exists in the state.
   *
   * @param key The key to check
   * @returns true if the key exists, false otherwise
   */
  public has(key: K): boolean {
    const mapKey = this.#getMapKey(key);
    return this.#state.has(mapKey);
  }

  /**
   * Returns an iterator for all key-value pairs in the state.
   *
   * @returns An iterator yielding [key, value] pairs
   */
  public *entries(): IterableIterator<[K, V]> {
    for (const [keyStr, value] of this.#state.entries()) {
      const keyBytes = this.#mapKeyToBytes(keyStr);
      const key = this.#codec.decodeKey(keyBytes);
      yield [key, value];
    }
  }

  /**
   * Returns an iterator for all keys in the state.
   *
   * @returns An iterator yielding keys
   */
  public *keys(): IterableIterator<K> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  /**
   * Returns an iterator for all values in the state.
   *
   * @returns An iterator yielding values
   */
  public values(): MapIterator<V> {
    return this.#state.values();
  }

  /**
   * Used to collect mutations to send back to the reduction operator.
   * @internal
   */
  public mutations(): pb.StateMutation[] {
    const mutations: pb.StateMutation[] = [];

    for (const keyStr of this.#dirtyKeys) {
      const keyBytes = this.#mapKeyToBytes(keyStr);
      const value = this.#state.get(keyStr);

      if (value === undefined) {
        // This key was deleted
        mutations.push(create(pb.StateMutationSchema, {
          mutation: {
            case: 'delete',
            value: { key: keyBytes },
          }
        }));
      } else {
        // This key was updated
        const valueData = this.#codec.encodeValue(value);
        mutations.push(create(pb.StateMutationSchema, {
          mutation: {
            case: 'put',
            value: create(pb.PutMutationSchema, {
              key: keyBytes,
              value: valueData,
            }),
          }
        }));
      }
    }

    return mutations;
  }

  /**
   * Clears all entries from the state and marks all existing keys as dirty.
   */
  public clear(): void {
    // Mark all keys as dirty before clearing
    for (const keyStr of this.#state.keys()) {
      this.#dirtyKeys.add(keyStr);
    }

    // Clear the state map
    this.#state.clear();
  }

  /**
   * Gets the number of entries in the state.
   *
   * @returns The number of entries
   */
  public get size(): number {
    return this.#state.size;
  }

  /**
   * Gets the name of this state map.
   *
   * @returns The state map name
   */
  public get name(): string {
    return this.#name;
  }

  #getMapKey(key: K): string {
    return this.#bytesToMapKey(this.#codec.encodeKey(key))
  }

  #loadEntries(entries: pb.StateEntry[]): void {
    for (const entry of entries) {
      const keyStr = this.#bytesToMapKey(entry.key);
      const value = this.#codec.decodeValue(entry.value);
      this.#state.set(keyStr, value);
    }
  }

  #mapKeyToBytes(keyStr: string): Uint8Array {
    return Buffer.from(keyStr, 'base64');
  }

  #bytesToMapKey(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }
}
