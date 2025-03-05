import type { ValueCodec } from "./value-codec";

interface MapCodecParams<K, V> {
  keyCodec: ValueCodec<K>;
  valueCodec: ValueCodec<V>;
}

/**
 * A codec that combines two scalar codecs to encode and decode map keys and
 * values.
 */
export class MapCodec<K, V> {
  private keyCodec: ValueCodec<K>;
  private valueCodec: ValueCodec<V>;

  constructor(params: MapCodecParams<K, V>) {
    this.keyCodec = params.keyCodec;
    this.valueCodec = params.valueCodec;
  }

  encodeKey(key: K): Uint8Array {
    return this.keyCodec.encode(key);
  }

  encodeValue(value: V): Uint8Array {
    return this.valueCodec.encode(value);
  }

  decodeKey(key: Uint8Array): K {
    return this.keyCodec.decode(key);
  }

  decodeValue(value: Uint8Array): V {
    return this.valueCodec.decode(value);
  }
}
