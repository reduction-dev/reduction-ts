import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { Temporal } from "temporal-polyfill";

export { Temporal, toTemporalInstant } from "temporal-polyfill";

export function instantToProto(instant: Temporal.Instant): Timestamp {
  const epochNanos = instant.epochNanoseconds;
  if (typeof epochNanos !== 'bigint') {
    throw new TypeError('instant.epochNanoseconds must be a BigInt');
  }
  const seconds = epochNanos / 1_000_000_000n;
  const nanos = Number(epochNanos % 1_000_000_000n);
  return create(TimestampSchema, { seconds, nanos });
}

export function instantFromProto(timestamp: Timestamp): Temporal.Instant {
  const epochNanos = timestamp.seconds * 1_000_000_000n + BigInt(timestamp.nanos);
  return Temporal.Instant.fromEpochNanoseconds(epochNanos);
}
