import { create } from '@bufbuild/protobuf';
import { type Job, Sink as BaseSink } from '../../topology';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Subject } from '../../handler/subject';

export class Sink extends BaseSink<Uint8Array> {
  private id: string;

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

  public collect(subject: Subject, value: Uint8Array): void {
    subject.context.addSinkRequest(this.id, value);
  }
}
