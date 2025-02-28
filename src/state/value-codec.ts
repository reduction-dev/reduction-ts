export interface ValueCodec<T> {
  encode(value: T): Uint8Array;
  decode(value: Uint8Array): T;
}
