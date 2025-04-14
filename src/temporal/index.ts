/**
 * Because working with time is a critical part of many Reduction jobs and
 * working with JavaScript's Date object can be tricky, this library uses the
 * new Temporal API to represent instants of time. However this API is not
 * implemented in browsers or Node, so this module provides a polyfill.
 *
 * The Temporal is a global object but the polyfill can be imported from this
 * module:
 *
 * ```
 * import { Temporal } from "reduction-ts/temporal";
 * ```
 *
 * See the [MDN Temporal Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
 * for information on using the Temporal.Instant API.
 * @module
 */

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { Temporal } from "temporal-polyfill";

export { Temporal, toTemporalInstant } from "temporal-polyfill";

/**
 * @internal
 */
export function instantToProto(instant: Temporal.Instant): Timestamp {
  const epochNanos = instant.epochNanoseconds;
  if (typeof epochNanos !== 'bigint') {
    throw new TypeError('instant.epochNanoseconds must be a BigInt');
  }
  const seconds = epochNanos / 1_000_000_000n;
  const nanos = Number(epochNanos % 1_000_000_000n);
  return create(TimestampSchema, { seconds, nanos });
}

/**
 * @internal
 */
export function instantFromProto(timestamp: Timestamp): Temporal.Instant {
  const epochNanos = timestamp.seconds * 1_000_000_000n + BigInt(timestamp.nanos);
  return Temporal.Instant.fromEpochNanoseconds(epochNanos);
}
