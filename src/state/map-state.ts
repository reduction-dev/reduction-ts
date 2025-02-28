import * as pb from "@rxn/proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";
import type { MapCodec } from "./map-codec";

// MapState manages a map of key-value pairs with state tracking
export class MapState<K, V> {
  #name: string;
  #state: Map<string, V> = new Map();
  #dirtyKeys: Set<string> = new Set();
  #codec: MapCodec<K, V>;

  constructor(name: string, codec: MapCodec<K, V>, stateEntries: pb.StateEntry[]) {
    this.#name = name;
    this.#codec = codec;
    this.#loadEntries(stateEntries);
  }

  public get(key: K): V | undefined {
    const mapKey = this.#getMapKey(key);
    return this.#state.get(mapKey);
  }

  public put(key: K, value: V): void {
    const mapKey = this.#getMapKey(key);
    this.#state.set(mapKey, value);
    this.#dirtyKeys.add(mapKey);
  }

  public delete(key: K): void {
    const mapKey = this.#getMapKey(key);
    const didRemove = this.#state.delete(mapKey);
    if (didRemove) {
      this.#dirtyKeys.add(mapKey);
    }
  }

  public has(key: K): boolean {
    const mapKey = this.#getMapKey(key);
    return this.#state.has(mapKey);
  }

  public *entries(): IterableIterator<[K, V]> {
    for (const [keyStr, value] of this.#state.entries()) {
      const keyBytes = this.#mapKeyToBytes(keyStr);
      const key = this.#codec.decodeKey(keyBytes);
      yield [key, value];
    }
  }

  public *keys(): IterableIterator<K> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  public values(): MapIterator<V> {
    return this.#state.values();
  }

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
  
  public clear(): void {
    // Mark all keys as dirty before clearing
    for (const keyStr of this.#state.keys()) {
      this.#dirtyKeys.add(keyStr);
    }
    
    // Clear the state map
    this.#state.clear();
  }
  
  public get size(): number {
    return this.#state.size;
  }

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

  // Helper method to convert string key back to binary for decodeKey
  #mapKeyToBytes(keyStr: string): Uint8Array {
    return Buffer.from(keyStr, 'base64');
  }

  // Helper method to convert binary key to string for Map usage
  #bytesToMapKey(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }
}
