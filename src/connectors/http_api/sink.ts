import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, Sink as BaseSink, type ConfigVar } from "../../topology";
import { stringVarProto } from "../../topology/config-var";

export interface HTTPAPISinkParams {
  addr?: ConfigVar<string>;
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
            addr: stringVarProto(params.addr),
          },
        },
      }),
    }));
  }
}
