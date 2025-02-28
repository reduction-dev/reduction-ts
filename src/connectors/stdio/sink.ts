import { create } from "@bufbuild/protobuf";
import type { Job } from "@rxn/topology";
import * as pb from "@rxn/proto/jobconfigpb/jobconfig_pb";
import { BaseSink } from "@rxn/topology/sink";
import type { Subject } from "@rxn/handler/subject";

export class Sink extends BaseSink {
  private id: string;

  constructor(job: Job, id: string) {
    super();
    this.id = id;
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id,
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
