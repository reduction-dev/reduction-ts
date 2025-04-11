import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job, ConfigVar } from '../../topology';
import type { KeyEventFunc } from '../../types';
import { stringVarProto } from '../../topology/config-var';

export interface KinesisSourceParams {
  keyEvent: KeyEventFunc;
  streamArn?: ConfigVar<string>;
  endpoint?: ConfigVar<string>;
}

export class Source {
  private id: string;
  private operators: Operator[];
  private streamArn?: ConfigVar<string>;
  private endpoint?: ConfigVar<string>;

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
            streamArn: stringVarProto(this.streamArn),
            endpoint: stringVarProto(this.endpoint),
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
