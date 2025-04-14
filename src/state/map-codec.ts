import type { ValueCodec } from "./value-codec";

/**
 * Parameters creating a MapCodec.
 */
export interface MapCodecParams<K, V> {
  /**
   * Encode/decode functions for the map keys
   */
  keyCodec: ValueCodec<K>;

  /**
   * Encode/decode functions for the map values
   */
  valueCodec: ValueCodec<V>;
}

/**
 * A codec that combines two scalar codecs to encode and decode map keys and
 * values.
 *
 * @typeParam K - The type of the map keys.
 * @typeParam V - The type of the map values.
 */
export class MapCodec<K, V> {
  private keyCodec: ValueCodec<K>;
  private valueCodec: ValueCodec<V>;

  /**
   * @param params - The codec parameters.
   */
  constructor(params: MapCodecParams<K, V>) {
    this.keyCodec = params.keyCodec;
    this.valueCodec = params.valueCodec;
  }

  /**
   * Take a typed key and encode it as a byte array.
   */
  encodeKey(key: K): Uint8Array {
    return this.keyCodec.encode(key);
  }

  /**
   * Take a typed value and encode it as a byte array.
   */
  encodeValue(value: V): Uint8Array {
    return this.valueCodec.encode(value);
  }

  /**
   * Take a byte array and decode it to a typed key.
   */
  decodeKey(key: Uint8Array): K {
    return this.keyCodec.decode(key);
  }

  /**
   * Take a byte array and decode it to a typed value.
   */
  decodeValue(value: Uint8Array): V {
    return this.valueCodec.decode(value);
  }
}
