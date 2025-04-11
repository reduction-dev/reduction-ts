import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job } from '../../topology';
import type { KeyEventFunc } from '../../types';

export interface EmbeddedSourceParams {
  keyEvent: KeyEventFunc;
  splitCount?: number;
  batchSize?: number;
  generator?: "sequence";
}

export class Source {
  private operators: Operator[];

  constructor(job: Job, id: string, params: EmbeddedSourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id,
        config: {
          case: 'embedded',
          value: {
            splitCount: params.splitCount,
            batchSize: params.batchSize,
            generator :params.generator === "sequence"
              ? pb.EmbeddedSource_GeneratorType.SEQUENCE
              : pb.EmbeddedSource_GeneratorType.UNSPECIFIED,
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
