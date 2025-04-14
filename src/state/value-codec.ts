/**
 * A pair of functions that encode and decode a value to and from a byte array.
 *
 * @typeParam T - The type that will be encoded and decoded
 */
export interface ValueCodecParams<T> {
  /**
   * Function to encode a value to a byte array
   *
   * @param value - The value to encode
   * @returns A byte array representing the encoded value
   */
  encode(value: T): Uint8Array;

  /**
   * Function to decode a byte array back to a value
   *
   * @param value - The byte array to decode
   * @returns The decoded value
   */
  decode(value: Uint8Array): T;
}

/**
 * A codec that serializes and deserializes values for storage.
 *
 * @typeParam T - The type that will be encoded and decoded
 */
export class ValueCodec<T> {
  #encode: (value: T) => Uint8Array;
  #decode: (value: Uint8Array) => T;

  /**
   * Creates a new ValueCodec with the provided encode and decode functions.
   *
   * @param params - The encode and decode functions
   */
  constructor({ encode, decode }: ValueCodecParams<T>) {
    this.#encode = encode;
    this.#decode = decode;
  }

  /**
   * Encode a value to a byte array.
   *
   * @param value - The value to encode
   * @returns A byte array representing the encoded value
   */
  encode(value: T): Uint8Array {
    return this.#encode(value);
  }

  /**
   * Decode a byte array to a value.
   *
   * @param value - The byte array to decode
   * @returns The decoded value
   */
  decode(value: Uint8Array): T {
    return this.#decode(value);
  }
}
