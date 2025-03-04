import type { ValueCodec } from "./value-codec";
import { toBinary, create, protoInt64, fromBinary } from "@bufbuild/protobuf";
import * as wkt from "@bufbuild/protobuf/wkt";

export class Int32ValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.Int32ValueSchema, create(wkt.Int32ValueSchema, { value }));
  }

  decode(value: Uint8Array): number {
    return fromBinary(wkt.Int32ValueSchema, value).value;
  }
}

export class Int64ValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.Int64ValueSchema, create(wkt.Int64ValueSchema, { 
      value: protoInt64.parse(value.toString()) 
    }));
  }

  decode(value: Uint8Array): number {
    const decoded = fromBinary(wkt.Int64ValueSchema, value);
    return Number(decoded.value.toString());
  }
}

export class Uint32ValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.UInt32ValueSchema, create(wkt.UInt32ValueSchema, { value }));
  }

  decode(value: Uint8Array): number {
    return fromBinary(wkt.UInt32ValueSchema, value).value;
  }
}

export class Uint64ValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.UInt64ValueSchema, create(wkt.UInt64ValueSchema, { 
      value: protoInt64.parse(value.toString()) 
    }));
  }

  decode(value: Uint8Array): number {
    const decoded = fromBinary(wkt.UInt64ValueSchema, value);
    return Number(decoded.value.toString());
  }
}

export class FloatValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.FloatValueSchema, create(wkt.FloatValueSchema, { value }));
  }

  decode(value: Uint8Array): number {
    return fromBinary(wkt.FloatValueSchema, value).value;
  }
}

export class DoubleValueCodec implements ValueCodec<number> {
  encode(value: number): Uint8Array {
    return toBinary(wkt.DoubleValueSchema, create(wkt.DoubleValueSchema, { value }));
  }

  decode(value: Uint8Array): number {
    return fromBinary(wkt.DoubleValueSchema, value).value;
  }
}

export class StringValueCodec implements ValueCodec<string> {
  encode(value: string): Uint8Array {
    return toBinary(wkt.StringValueSchema, create(wkt.StringValueSchema, { value }));
  }

  decode(value: Uint8Array): string {
    return fromBinary(wkt.StringValueSchema, value).value;
  }
}

export class BooleanValueCodec implements ValueCodec<boolean> {
  encode(value: boolean): Uint8Array {
    return toBinary(wkt.BoolValueSchema, create(wkt.BoolValueSchema, { value }));
  }

  decode(value: Uint8Array): boolean {
    return fromBinary(wkt.BoolValueSchema, value).value;
  }
}

export class TimestampValueCodec implements ValueCodec<Date> {
  encode(value: Date): Uint8Array {
    return toBinary(wkt.TimestampSchema, wkt.timestampFromDate(value));
  }

  decode(value: Uint8Array): Date {
    return wkt.timestampDate(fromBinary(wkt.TimestampSchema, value))
  }
}
