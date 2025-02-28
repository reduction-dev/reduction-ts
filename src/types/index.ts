import type { Subject } from "@rxn/handler/subject";

/**
 * An event with a partitioning key and timestamp
 */
export interface KeyedEvent {
  key: Uint8Array;
  value: Uint8Array;
  timestamp: Date;
}

export interface OperatorHandler {
  /**
   * Called when a new event arrives. The subject is a set of APIs scoped to
   * the specific partition key being used. Because of this scoping, think of this
   * as the subject (e.g. a User, a Product) in your domain.
   * 
   * @param subject the subject to interact with
   * @param event the keyed event that was received
   */
  onEvent(subject: Subject, event: KeyedEvent): void | Promise<void>;

  /**
   * A previously set timer expires. This is an asynchronous action where the
   * timer fires at the specified time AT THE EARLIEST. That means that events
   * after the timer's timestamp have likely already arrived.
   * 
   * @param subject the subject to interact with
   * @param timer the timestamp when the timer was set to expire
   */
  onTimerExpired(subject: Subject, timer: Date): void | Promise<void>;
}

export type KeyEventFunc = (event: Uint8Array) => KeyedEvent[] | Promise<KeyedEvent[]>;
