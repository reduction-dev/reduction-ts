import type { Subject } from "@rxn/handler/subject";
import type { Operator } from "../topology/operator";

// Domain types (not protocol buffer types)
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

export interface JobDefinition {
  /**
   * The number of workers to use
   */
  workerCount?: number;

  /**
   * The number of key groups to use
   */
  keyGroupCount?: number;

  /**
   * The working storage location
   */
  workingStorageLocation?: string;

  /**
   * The savepoint storage location
   */
  savepointStorageLocation?: string;

  /**
   * The sources to use
   */
  sources: SourceDefinition[];

  /**
   * The sinks to use
   */
  sinks: SinkDefinition[];

  /**
   * The operators to use
   */
  operators: Operator[];
}

export type SourceType = 'stdio' | 'kinesis' | 'http_api' | 'embedded';
export type SinkType = 'stdio' | 'http_api' | 'memory';

export interface SourceDefinition {
  id: string;
  type: SourceType;
  config?: any;
  keyEvent(event: Uint8Array): KeyedEvent[] | Promise<KeyedEvent[]>;
  operator: OperatorDefinition;
}

export interface SinkDefinition {
  id: string;
  type: SinkType;
  config?: any;
}

export interface OperatorDefinition {
  id: string;
  parallelism: number;
  handler: OperatorHandler;
}

export interface JobOptions {
  /**
   * The port to use for the server
   */
  port?: number;
}

export type KeyEventFunc = (event: Uint8Array) => KeyedEvent[] | Promise<KeyedEvent[]>;
