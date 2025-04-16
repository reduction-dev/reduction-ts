import { create } from "@bufbuild/protobuf";
import * as jobconfigpb from "../../proto/jobconfigpb/jobconfig_pb";
import type { Operator, Job, ConfigVar } from "../../topology";
import type { KeyedEvent, KeyEventFunc } from "../../types";
import { stringVarProto } from "../../topology/config-var";
import { KafkaRecord } from "./kafka_record";

/**
 * Parameters for creating a Kafka source.
 */
export interface KafkaSourceParams {
  /**
   * Function that converts event data to KeyedEvents for processing.
   */
  keyEvent: KeyEventFunc<KafkaRecord>;

  /**
   * The Kafka consumer group ID.
   */
  consumerGroup: ConfigVar<string>;

  /**
   * Comma-separated list of broker addresses.
   */
  brokers: ConfigVar<string>;

  /**
   * Comma-separated list of Kafka topic names.
   */
  topics: ConfigVar<string>;
}

/**
 * Kafka Source provides connectivity to Kafka topics for real-time data processing.
 */
export class Source {
  private operators: Operator[];

  /**
   * Creates a new Kafka source.
   *
   * @param job - The job that will use this source
   * @param id - An identifier for this source
   * @param params - Configuration parameters for the Kafka source
   */
  constructor(job: Job, id: string, params: KafkaSourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: function (data: Uint8Array): KeyedEvent[] {
        const record = KafkaRecord.fromBinary(data);
        return params.keyEvent(record);
      },
      operators: this.operators,
      config: create(jobconfigpb.SourceSchema, {
        id,
        config: {
          case: 'kafka',
          value: {
            consumerGroup: stringVarProto(params.consumerGroup),
            brokers: stringVarProto(params.brokers),
            topics: stringVarProto(params.topics),
          },
        },
      }),
    }));
  }

  /**
   * Connects an operator to this source.
   *
   * @param operator - The operator that will process events from this source
   */
  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
