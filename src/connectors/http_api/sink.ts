import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, Sink as BaseSink, type ConfigVar } from "../../topology";
import { stringVarProto } from "../../topology/config-var";
import type { Subject } from "../../handler/subject";

/**
 * Parameters for creating an HTTP API sink.
 */
export interface HTTPAPISinkParams {
  /**
   * The address where the HTTP API sink will send data.
   */
  addr?: ConfigVar<string>;
}

export interface HTTPAPISinkEvent {
	/**
   * A namespace for writing the record
   */
	Topic: string


  /**
   * Arbitrary data to send to the sink
   */
	Data: Uint8Array
}

/**
 * HTTP API Sink allows you to send events to external HTTP services.
 */
export class Sink extends BaseSink<HTTPAPISinkEvent> {
  private id: string;

  /**
   * Creates a new HTTP API sink.
   *
   * @param job - The job that will use this sink
   * @param id - An identifier for this sink
   * @param params - Configuration parameters for the HTTP API sink
   */
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

  /**
   * Collects an event to be sent to the HTTP API sink.
   *
   * @param subject - The subject associated with this event event
   * @param value - The event data to send to the sink
   */
  public collect(subject: Subject, value: HTTPAPISinkEvent): void {
    const jsonString = JSON.stringify(value);
    subject.context.addSinkRequest(this.id, Buffer.from(jsonString));
  }
}
