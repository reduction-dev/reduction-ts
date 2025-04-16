import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import { type Job, Sink as BaseSink, type ConfigVar } from "../../topology";
import { stringVarProto } from "../../topology/config-var";
import type { Subject } from "../../handler/subject";

/**
 * Parameters for creating a Kafka sink.
 */
export interface KafkaSinkParams {
  /**
   * Comma-separated list of broker addresses.
   */
  brokers: ConfigVar<string>;
}

/**
 * Kafka Sink allows you to send events to external Kafka topics.
 */
export class Sink extends BaseSink<Uint8Array> {
  private id: string;

  /**
   * Creates a new Kafka sink.
   *
   * @param job - The job that will use this sink
   * @param id - An identifier for this sink
   * @param params - Configuration parameters for the Kafka sink
   */
  constructor(job: Job, id: string, params: KafkaSinkParams) {
    super();
    this.id = id;
    job.context.registerSink(() => ({
      config: create(pb.SinkSchema, {
        id: this.id,
        config: {
          case: 'kafka',
          value: {
            brokers: stringVarProto(params.brokers),
          },
        },
      }),
    }));
  }

  /**
   * Collects an event to be sent to the Kafka sink.
   *
   * @param subject - The subject associated with this event
   * @param value - The serialized Kafka record to send to the sink
   */
  public collect(subject: Subject, value: Uint8Array): void {
    subject.context.addSinkRequest(this.id, value);
  }
}
