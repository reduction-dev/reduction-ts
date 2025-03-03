import { create } from "@bufbuild/protobuf";
import { type Job, BaseSink } from "../../topology";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";

export class Sink extends BaseSink {
  constructor(job: Job, id: string) {
    super();
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
}
