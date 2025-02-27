import { create } from "@bufbuild/protobuf";
import type { Job } from "@rxn/topology";
import * as pb from "@rxn/proto/jobconfigpb/jobconfig_pb";
import { BaseSink } from "@rxn/topology/sink";

export class Sink extends BaseSink {
  constructor(job: Job, id: string) {
    super();
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
}
