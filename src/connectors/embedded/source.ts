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
  private id: string;
  private operators: Operator[];
  private splitCount: number;
  private batchSize: number;
  private generator: pb.EmbeddedSource_GeneratorType;

  constructor(job: Job, id: string, params: EmbeddedSourceParams) {
    this.id = id;
    this.operators = [];
    this.splitCount = params.splitCount || 1;
    this.batchSize = params.batchSize || 10;
    this.generator = params.generator === "sequence" 
      ? pb.EmbeddedSource_GeneratorType.SEQUENCE 
      : pb.EmbeddedSource_GeneratorType.UNSPECIFIED;

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id: this.id,
        config: {
          case: 'embedded',
          value: {
            splitCount: this.splitCount,
            batchSize: this.batchSize,
            generator: this.generator,
          },
        },
      }),
    }));
  }

  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
