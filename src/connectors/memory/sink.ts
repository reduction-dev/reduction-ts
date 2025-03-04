import { create } from "@bufbuild/protobuf";
import { type Job, BaseSink } from "../../topology";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import type { Subject } from "../../handler/subject";

export class Sink<T> extends BaseSink<T> {
  private id: string;
  public readonly records: T[] = [];

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

  public collect(subject: Subject, value: T): void {
    this.records.push(value);
  }
}
