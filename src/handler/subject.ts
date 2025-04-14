import type { StateEntry } from '../proto/handlerpb/handler_pb';
import { SubjectContext } from './subject-context';
import { Temporal } from "../temporal";

// A map of state IDs to state entries for one key.
type KeyState = Map<string, StateEntry[]>;

/**
 * Subject is a key's context insides of the operator handler. It's passed to
 * the onEvent and onTimerExpired functions and allows you to set new timers,
 * get the current key, or read the key's current watermark.
 */
export class Subject {
  /**
   * An internal API for preserving context between handler calls.
   * @internal
   */
  public context: SubjectContext

  /**
   * The subject's key from the KeyedEvent.
   */
  public key: Uint8Array;

  /**
   * The current watermark for the subject. Watermarks advance periodically to
   * indicate the cutoff point where we expect no events with earlier
   * timestamps.
   */
  public watermark: Temporal.Instant;

  /**
   * @internal
   */
  constructor(key: Uint8Array, watermark: Temporal.Instant, keyState: KeyState) {
    this.key = key;
    this.watermark = watermark;
    this.context = new SubjectContext(key, watermark, keyState);
  }

  /**
   * Sets a timer that will fire once the watermark reaches the given timestamp.
   */
  setTimer(timestamp: Temporal.Instant): void {
    this.context.setTimer(timestamp);
  }
}
