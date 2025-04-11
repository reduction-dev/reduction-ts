import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job, ConfigVar } from '../../topology';
import type { KeyEventFunc } from '../../types';
import { stringVarProto } from '../../topology/config-var';

export interface HTTPAPISourceParams {
  keyEvent: KeyEventFunc;
  addr?: ConfigVar<string>;
  topics?: string[];
}

export class Source {
  private operators: Operator[];

  constructor(job: Job, id: string, params: HTTPAPISourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id,
        config: {
          case: 'httpApi',
          value: {
            addr: stringVarProto(params.addr),
            topics: params.topics,
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
