/**
 * MapCodec defines how keys and values are encoded/decoded for storage.
 */
export interface MapCodec<K, T> {
  encodeKey(key: K): Uint8Array;
  encodeValue(value: T): Uint8Array;
  decodeKey(key: Uint8Array): K;
  decodeValue(value: Uint8Array): T;
}
