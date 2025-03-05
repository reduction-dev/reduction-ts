export interface ValueCodecParams<T> {
  encode(value: T): Uint8Array;
  decode(value: Uint8Array): T;
}

export class ValueCodec<T> {
  #encode: (value: T) => Uint8Array;
  #decode: (value: Uint8Array) => T;

  constructor({ encode, decode }: ValueCodecParams<T>) {
    this.#encode = encode;
    this.#decode = decode;
  }

  encode(value: T): Uint8Array {
    return this.#encode(value);
  }

  decode(value: Uint8Array): T {
    return this.#decode(value);
  }
}

export const int32ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return new Uint8Array([value]);
  },
  decode(value: Uint8Array) {
    return value[0];
  }
});
