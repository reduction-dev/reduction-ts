import type { Subject } from "../handler/subject";
import { Temporal } from "../temporal";

/**
 * An event with a partitioning key and timestamp. KeyedEvents are returned from
 * the `keyEvent` function of a source and passed to the {@link
 * OperatorHandler[onEvent]} method of the {@link OperatorHandler}.
 */
export interface KeyedEvent {
  /**
   * A partition key for an event. Use a natural ID for your domain like a user
   * ID.
   */
  key: Uint8Array;

  /**
   * The event payload serialized for network transport.
   */
  value: Uint8Array;

  /**
   * A timestamp associated with the event. It may be derived from the time the
   * event arrived at the source or some timestamp available in the event data.
   */
  timestamp: Temporal.Instant;
}

/**
 * An OperatorHandler is a pair of functions that have access to state via the
 * {@link Subject}. These are the primary functions used to process and
 * aggregate event data.
 */
export interface OperatorHandler {
  /**
   * Called when a new event arrives for processing.
   *
   * @param subject - The subject to interact with. The subject is a set of APIs scoped to
   * the specific partition key being used. Because of this scoping, think of this
   * as the subject (e.g. a User, a Product) in your domain.
   *
   * @param event The received event data
   */
  onEvent(subject: Subject, event: KeyedEvent): void | Promise<void>;

  /**
   * Called when a previously set timer expires. This is an asynchronous action:
   * the timer fires after the time specified in {@link Subject.setTimer}. That
   * means that some events after the timer's timestamp have likely already
   * arrived.
   *
   * @param subject The subject to interact with
   * @param timer The timestamp when the timer was set to expire
   */
  onTimerExpired(subject: Subject, timer: Temporal.Instant): void | Promise<void>;
}

export type KeyEventFunc = (event: Uint8Array) => KeyedEvent[];
