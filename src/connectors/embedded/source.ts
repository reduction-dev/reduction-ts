import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb';
import type { Operator, Job } from '../../topology';
import type { KeyEventFunc } from '../../types';

/**
 * Parameters for creating an embedded source.
 */
export interface EmbeddedSourceParams {
  /**
   * Function that converts event data to KeyedEvents for processing.
   */
  keyEvent: KeyEventFunc<Uint8Array>;

  /**
   * Optional number of splits to create for reading parallelism.
   */
  splitCount?: number;

  /**
   * Optional number of events to generate in each batch.
   */
  batchSize?: number;

  /**
   * Optional generator type, currently only supports "sequence".
   */
  generator?: "sequence";
}

/**
 * Embedded Source generates test data within the system without requiring
 * external connectivity. Useful for testing and development.
 */
export class Source {
  private operators: Operator[];

  /**
   * Creates a new embedded source.
   *
   * @param job - The job that will use this source
   * @param id - An identifier for this source
   * @param params - Configuration parameters for the embedded source
   */
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

  /**
   * Connects an operator to this source.
   *
   * @param operator - The operator that will process events from this source
   */
  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
