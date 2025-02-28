/**
 * MapCodec defines how the keys and values of map entries are encoded/decoded
 * for storage.
 */
export interface MapCodec<K, T> {
  encodeKey(key: K): Uint8Array;
  encodeValue(value: T): Uint8Array;
  decodeKey(key: Uint8Array): K;
  decodeValue(value: Uint8Array): T;
}
