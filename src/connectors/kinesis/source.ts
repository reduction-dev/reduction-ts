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
  private operators: Operator[];

  constructor(job: Job, id: string, params: KinesisSourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
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

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
