import { ValueCodec } from "./value-codec";
import { toBinary, create, protoInt64, fromBinary } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";
import { Instant, instantToProto, instantFromProto } from "../instant";

export const int32ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.Int32ValueSchema, create(wkt.Int32ValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.Int32ValueSchema, value).value;
  }
});

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

export const uint32ValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.UInt32ValueSchema, create(wkt.UInt32ValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.UInt32ValueSchema, value).value;
  }
});

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

export const floatValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.FloatValueSchema, create(wkt.FloatValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.FloatValueSchema, value).value;
  }
});

export const doubleValueCodec = new ValueCodec<number>({
  encode(value: number) {
    return toBinary(wkt.DoubleValueSchema, create(wkt.DoubleValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.DoubleValueSchema, value).value;
  }
});

export const stringValueCodec = new ValueCodec<string>({
  encode(value: string) {
    return toBinary(wkt.StringValueSchema, create(wkt.StringValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.StringValueSchema, value).value;
  }
});

export const booleanValueCodec = new ValueCodec<boolean>({
  encode(value: boolean) {
    return toBinary(wkt.BoolValueSchema, create(wkt.BoolValueSchema, { value }));
  },
  decode(value: Uint8Array) {
    return fromBinary(wkt.BoolValueSchema, value).value;
  }
});

export const timestampValueCodec = new ValueCodec<Instant>({
  encode(value: Instant) {
    return toBinary(wkt.TimestampSchema, instantToProto(value));
  },
  decode(value: Uint8Array) {
    return instantFromProto(fromBinary(wkt.TimestampSchema, value));
  }
});
