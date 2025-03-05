import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { Temporal } from "temporal-polyfill"

// Allow Instant to act as both a type and a value for TypeScript.
export type Instant = Temporal.Instant;
export const Instant = Temporal.Instant;

export function instantToProto(instant: Instant): Timestamp {
  const epochNanos = instant.epochNanoseconds;
  const seconds = epochNanos / 1_000_000_000n;
  const nanos = Number(epochNanos % 1_000_000_000n);
  return create(TimestampSchema, { seconds, nanos });
}

export function instantFromProto(timestamp: Timestamp): Instant {
  const epochNanos = timestamp.seconds * 1_000_000_000n + BigInt(timestamp.nanos);
  return Instant.fromEpochNanoseconds(epochNanos);
}

export function currentInstant(): Instant {
  return Temporal.Now.instant();
}
