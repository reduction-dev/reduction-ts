import * as pb from "@rxn/proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";
import type { MapCodec } from "./map-codec";

// ValueUpdate represents an update to a value in the map
interface ValueUpdate<V> {
  isDelete: boolean;
  value: V;
}

// MapState manages a map of key-value pairs with state tracking
export class MapState<K, V> {
  #name: string;
  #original: Map<string, V> = new Map();
  #updates: Map<string, ValueUpdate<V>> = new Map();
  #codec: MapCodec<K, V>;
  #size: number = 0;

  constructor(name: string, codec: MapCodec<K, V>, stateEntries: pb.StateEntry[]) {
    this.#name = name;
    this.#codec = codec;
    this.#loadEntries(stateEntries);
  }

  #loadEntries(entries: pb.StateEntry[]): void {
    for (const entry of entries) {
      const keyStr = this.#bytesToKeyString(entry.key);
      const value = this.#codec.decodeValue(entry.value);
      this.#original.set(keyStr, value);
    }
    this.#size = this.#original.size;
  }

  // Helper method to convert binary key to string for Map usage
  #bytesToKeyString(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public get(key: K): V | undefined {
    const keyBytes = this.#codec.encodeKey(key);
    const keyStr = this.#bytesToKeyString(keyBytes);
    
    // Check updates first
    const update = this.#updates.get(keyStr);
    if (update !== undefined) {
      return update.isDelete ? undefined : update.value;
    }
    
    // Fall back to original values
    return this.#original.get(keyStr);
  }

  public put(key: K, value: V): void {
    const keyBytes = this.#codec.encodeKey(key);
    const keyStr = this.#bytesToKeyString(keyBytes);
    const hadKey = this.has(key);
    
    this.#updates.set(keyStr, {
      isDelete: false,
      value: value
    });
    
    if (!hadKey) {
      this.#size++;
    }
  }

  public delete(key: K): void {
    const keyBytes = this.#codec.encodeKey(key);
    const keyStr = this.#bytesToKeyString(keyBytes);
    if (!this.has(key)) {
      return;
    }
    
    this.#updates.set(keyStr, {
      isDelete: true,
      value: {} as V // Dummy value, never used
    });
    
    this.#size--;
  }

  public has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  public entries(): [K, V][] {
    const result: [K, V][] = [];
    
    // Process original entries
    for (const [keyStr, value] of this.#original.entries()) {
      // Check if this key has an update
      const update = this.#updates.get(keyStr);
      if (update !== undefined) {
        if (!update.isDelete) {
          // Use the updated value
          // Note: We need to convert the string key back to bytes for decodeKey
          const keyBytes = this.#keyStringToBytes(keyStr);
          const key = this.#codec.decodeKey(keyBytes);
          result.push([key, update.value]);
        }
        // Skip if deleted
        continue;
      }
      
      // No update, use original value
      const keyBytes = this.#keyStringToBytes(keyStr);
      const key = this.#codec.decodeKey(keyBytes);
      result.push([key, value]);
    }
    
    // Process updates for keys that weren't in the original map
    for (const [keyStr, update] of this.#updates.entries()) {
      if (this.#original.has(keyStr)) {
        // Already processed above
        continue;
      }
      
      if (!update.isDelete) {
        const keyBytes = this.#keyStringToBytes(keyStr);
        const key = this.#codec.decodeKey(keyBytes);
        result.push([key, update.value]);
      }
    }
    
    return result;
  }

  // Helper method to convert string key back to binary for decodeKey
  #keyStringToBytes(keyStr: string): Uint8Array {
    const bytes = new Uint8Array(keyStr.length / 2);
    for (let i = 0; i < keyStr.length; i += 2) {
      bytes[i / 2] = parseInt(keyStr.substring(i, i + 2), 16);
    }
    return bytes;
  }

  public keys(): K[] {
    return this.entries().map(([key]) => key);
  }

  public values(): V[] {
    return this.entries().map(([, value]) => value);
  }

  public mutations(): pb.StateMutation[] {
    const mutations: pb.StateMutation[] = [];
    
    for (const [keyStr, update] of this.#updates.entries()) {
      const keyBytes = this.#keyStringToBytes(keyStr);
      
      if (update.isDelete) {
        mutations.push(create(pb.StateMutationSchema, {
          mutation: {
            case: 'delete',
            value: { key: keyBytes },
          }
        }));
      } else {
        const valueData = this.#codec.encodeValue(update.value);
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
    // Mark all original entries as deleted
    for (const keyStr of this.#original.keys()) {
      this.#updates.set(keyStr, {
        isDelete: true,
        value: {} as V // Dummy value, never used
      });
    }
    
    // Also mark all updated entries as deleted
    for (const keyStr of this.#updates.keys()) {
      this.#updates.set(keyStr, {
        isDelete: true,
        value: {} as V // Dummy value, never used
      });
    }
    
    this.#size = 0;
  }
  
  public get size(): number {
    return this.#size;
  }

  public get name(): string {
    return this.#name;
  }

}
