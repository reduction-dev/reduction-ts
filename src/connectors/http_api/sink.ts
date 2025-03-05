import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, Sink as BaseSink } from "../../topology";

export interface HTTPAPISinkParams {
  addr?: string;
}

export class Sink extends BaseSink<Uint8Array> {
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
