import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, Sink as BaseSink, type ConfigVar } from "../../topology";
import { stringVarProto } from "../../topology/config-var";
import type { Subject } from "../../handler/subject";

export interface HTTPAPISinkParams {
  addr?: ConfigVar<string>;
}

export interface HTTPAPISinkEvent {
	/**
   * A namespace for writing the record
   */
	Topic: string


  /**
   * Arbitrary data to be sent to the sink
   */
	Data: Uint8Array
}

export class Sink extends BaseSink<HTTPAPISinkEvent> {
  private id: string;

  constructor(job: Job, id: string, params: HTTPAPISinkParams = {}) {
    super();
    this.id = id;
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id: this.id,
        config: {
          case: 'httpApi',
          value: {
            addr: stringVarProto(params.addr),
          },
        },
      }),
    }));
  }

  public collect(subject: Subject, value: HTTPAPISinkEvent): void {
    const jsonString = JSON.stringify(value);
    subject.context.addSinkRequest(this.id, Buffer.from(jsonString));
  }
}
