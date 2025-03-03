import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, BaseSink } from "../../topology";

export interface HTTPAPISinkParams {
  addr?: string;
}

export class Sink extends BaseSink {
  constructor(job: Job, id: string, params: HTTPAPISinkParams = {}) {
    super();
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id,
        config: {
          case: 'httpApi',
          value: {
            addr: params.addr,
          },
        },
      }),
    }));
  }
}
