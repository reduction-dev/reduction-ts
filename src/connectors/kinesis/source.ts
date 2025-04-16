import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import * as kinesispb from '../../proto/kinesispb/kinesis_pb';
import type { Operator, Job, ConfigVar } from '../../topology';
import type { KeyedEvent, KeyEventFunc } from '../../types';
import { stringVarProto } from '../../topology/config-var';
import { KinesisRecord } from './kinesis_record';

/**
 * Parameters for creating a Kinesis source.
 */
export interface KinesisSourceParams {
  /**
   * Function that converts event data to KeyedEvents for processing.
   */
  keyEvent: KeyEventFunc<KinesisRecord>;

  /**
   * The ARN of the Kinesis stream to read from.
   */
  streamArn?: ConfigVar<string>;

  /**
   * Optional custom endpoint URL for connecting to Kinesis.
   */
  endpoint?: ConfigVar<string>;
}

/**
 * Kinesis Source provides connectivity to AWS Kinesis streams for real-time
 * data processing from AWS services.
 */
export class Source {
  private operators: Operator[];

  /**
   * Creates a new Kinesis source.
   *
   * @param job - The job that will use this source
   * @param id - An identifier for this source
   * @param params - Configuration parameters for the Kinesis source
   */
  constructor(job: Job, id: string, params: KinesisSourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: function (data: Uint8Array): KeyedEvent[] {
        const record = KinesisRecord.fromBinary(data);
        return params.keyEvent(record);
      },
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id,
        config: {
          case: 'kinesis',
          value: {
            streamArn: stringVarProto(params.streamArn),
            endpoint: stringVarProto(params.endpoint),
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
