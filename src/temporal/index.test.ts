import { expect, test } from "bun:test";
import { instantFromProto, instantToProto } from ".";
import { Temporal } from ".";

test("converting between Temporal.Instant and proto timestamp", () => {
  const instant = Temporal.Instant.from("2009-02-13T23:31:30.123456789Z");
  const timestamp = instantToProto(instant);

  // Objects represent the same instant.
  expect(timestamp.seconds).toBe(BigInt(instant.epochSeconds));
  expect(timestamp.nanos).toBe(Number(instant.epochNanoseconds % 1_000_000_000n));

  // Convert back to instant
  expect(instantFromProto(timestamp).equals(instant)).toBeTrue();
});
