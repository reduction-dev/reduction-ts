import { create } from "@bufbuild/protobuf";
import { type Job, Sink as BaseSink } from "../../topology";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import type { Subject } from "../../handler/subject";

/**
 * Memory Sink captures events in memory for testing purposes.
 * Events are stored in the records array for inspection after a test run.
 *
 * @typeParam T - The type of records stored in this sink
 */
export class Sink<T> extends BaseSink<T> {
  private id: string;

  /**
   * The collected records from the sink execution.
   */
  public readonly records: T[] = [];

  /**
   * Creates a new memory sink.
   *
   * @param job - The job that will use this sink
   * @param id - An identifier for this sink
   */
  constructor(job: Job, id: string) {
    super();
    this.id = id;
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id,
        config: {
          case: 'memory',
          value: {},
        },
      }),
    }));
  }

  /**
   * Collects an event to be stored in memory.
   *
   * @param subject - The subject associated with this event
   * @param value - The data to store in memory
   */
  public collect(subject: Subject, value: T): void {
    this.records.push(value);
  }
}
