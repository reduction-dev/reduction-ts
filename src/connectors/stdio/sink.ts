import { create } from '@bufbuild/protobuf';
import { type Job, Sink as BaseSink } from '../../topology';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Subject } from '../../handler/subject';

/**
 * Standard Input/Output Sink allows you to write events to stdout.
 * This is useful for development and testing workflows.
 */
export class Sink extends BaseSink<Uint8Array> {
  private id: string;

  /**
   * Creates a new stdio sink.
   *
   * @param job - The job that will use this sink
   * @param id - An identifier for this sink
   */
  constructor(job: Job, id: string) {
    super();
    this.id = id;
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id: this.id,
        config: {
          case: 'stdio',
          value: {},
        },
      }),
    }));
  }

  /**
   * Collects an event to be sent to the stdio sink.
   *
   * @param subject - The subject associated with this event
   * @param value - The binary data to send to the sink
   */
  public collect(subject: Subject, value: Uint8Array): void {
    subject.context.addSinkRequest(this.id, value);
  }
}
