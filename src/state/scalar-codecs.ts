/**
 * This module provides a collection of value codecs for common data types.
 * Each codec converts between a TypeScript type and a binary representation
 * suitable for state storage.
 *
 * @module state/scalar-codecs
 */

import { ValueCodec } from "./value-codec";
import { toBinary, create, protoInt64, fromBinary } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { Temporal, instantToProto, instantFromProto } from "../temporal";

/**
 * Codec for 32-bit signed integers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers Int32Value type.
 */
export const int32ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.Int32ValueSchema, create(wkt.Int32ValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.Int32ValueSchema, value).value;
  }
});

/**
 * Codec for 64-bit signed integers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers Int64Value type.
 */
export const int64ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.Int64ValueSchema, create(wkt.Int64ValueSchema, {
      value: protoInt64.parse(value.toString())
    }));
  },
  decode(value: Uint8Array) {
    const decoded = fromBinary(wkt.Int64ValueSchema, value);
    return Number(decoded.value.toString());
  }
});

/**
 * Codec for 32-bit unsigned integers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers UInt32Value type.
 */
export const uint32ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.UInt32ValueSchema, create(wkt.UInt32ValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.UInt32ValueSchema, value).value;
  }
});

/**
 * Codec for 64-bit unsigned integers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers UInt64Value type.
 */
export const uint64ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.UInt64ValueSchema, create(wkt.UInt64ValueSchema, {
      value: protoInt64.parse(value.toString())
    }));
  },
  decode(value: Uint8Array) {
    const decoded = fromBinary(wkt.UInt64ValueSchema, value);
    return Number(decoded.value.toString());
  }
});

/**
 * Codec for 32-bit floating point numbers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers FloatValue type.
 */
export const floatValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.FloatValueSchema, create(wkt.FloatValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.FloatValueSchema, value).value;
  }
});

/**
 * Codec for 64-bit floating point numbers.
 * Encodes and decodes between JavaScript numbers and Protocol Buffers DoubleValue type.
 */
export const doubleValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.DoubleValueSchema, create(wkt.DoubleValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.DoubleValueSchema, value).value;
  }
});

/**
 * Codec for string values.
 * Encodes and decodes between JavaScript strings and Protocol Buffers StringValue type.
 */
export const stringValueCodec = new ValueCodec<string>({
  encode(value: string) {
    return toBinary(wkt.StringValueSchema, create(wkt.StringValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.StringValueSchema, value).value;
  }
});

/**
 * Codec for boolean values.
 * Encodes and decodes between JavaScript booleans and Protocol Buffers BoolValue type.
 */
export const booleanValueCodec = new ValueCodec<boolean>({
  encode(value: boolean) {
    return toBinary(wkt.BoolValueSchema, create(wkt.BoolValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.BoolValueSchema, value).value;
  }
});

/**
 * Codec for timestamp values.
 * Encodes and decodes between Temporal.Instant objects and Protocol Buffers Timestamp type.
 */
export const timestampValueCodec = new ValueCodec<Temporal.Instant>({
  encode(value: Temporal.Instant) {
    return toBinary(wkt.TimestampSchema, instantToProto(value));
  },
  decode(value: Uint8Array) {
    return instantFromProto(fromBinary(wkt.TimestampSchema, value));
  }
});
