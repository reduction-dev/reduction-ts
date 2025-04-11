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
  private id: string;
  private operators: Operator[];
  private addr?: ConfigVar<string>;
  private topics: string[];

  constructor(job: Job, id: string, params: HTTPAPISourceParams) {
    this.id = id;
    this.operators = [];
    this.addr = params.addr;
    this.topics = params.topics || [];

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id: this.id,
        config: {
          case: 'httpApi',
          value: {
            addr: stringVarProto(this.addr),
            topics: this.topics,
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
