import * as pb from '../proto/handlerpb/handler_pb';
import { create } from '@bufbuild/protobuf';
import { type Timestamp, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { SubjectContext, type StateEntry } from './subject-context';

// A map of state IDs to state entries for one key.
type KeyState = Map<string, StateEntry[]>;

/**
 * Implementation of the Subject interface for handling state and sinks
 */
export class Subject {
  public context: SubjectContext
  constructor(key: Uint8Array, timestamp: Date, watermark: Date, keyState: KeyState) {
    this.context = new SubjectContext(key, timestamp, watermark, keyState);
  }

  /**
   * Sets a timer that will fire at the given timestamp
   * @param timestamp the time when the timer should fire
   */
  setTimer(timestamp: Date): void {
    this.context.setTimer(timestamp);
  }
}
