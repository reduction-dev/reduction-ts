import type { StateEntry } from '../proto/handlerpb/handler_pb';
import { SubjectContext } from './subject-context';
import { Temporal } from "../temporal";

// A map of state IDs to state entries for one key.
type KeyState = Map<string, StateEntry[]>;

/**
 * Implementation of the Subject interface for handling state and sinks
 */
export class Subject {
  public context: SubjectContext
  constructor(key: Uint8Array, watermark: Temporal.Instant, keyState: KeyState) {
    this.context = new SubjectContext(key, watermark, keyState);
  }

  /**
   * Sets a timer that will fire at the given timestamp
   * @param timestamp the time when the timer should fire
   */
  setTimer(timestamp: Temporal.Instant): void {
    this.context.setTimer(timestamp);
  }

  /**
   * Returns the key of the current subject
   */
  get key(): Uint8Array {
    return this.context.key;
  }

  get watermark(): Temporal.Instant {
    return this.context.watermark
  }
}
