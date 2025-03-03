import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job } from '../../topology';
import type { KeyEventFunc } from '../../types';

export interface KinesisSourceParams {
  keyEvent: KeyEventFunc;
  streamArn?: string;
  endpoint?: string;
}

export class Source {
  private id: string;
  private operators: Operator[];
  private streamArn?: string;
  private endpoint?: string;

  constructor(job: Job, id: string, params: KinesisSourceParams) {
    this.id = id;
    this.operators = [];
    this.streamArn = params.streamArn;
    this.endpoint = params.endpoint;

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id: this.id,
        config: {
          case: 'kinesis',
          value: {
            streamArn: this.streamArn,
            endpoint: this.endpoint,
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
