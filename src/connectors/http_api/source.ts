import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job, ConfigVar } from '../../topology';
import type { KeyEventFunc } from '../../types';
import { stringVarProto } from '../../topology/config-var';

/**
 * Parameters for creating an HTTP API source.
 */
export interface HTTPAPISourceParams {
  /**
   * Function that converts event data to KeyedEvents for processing.
   */
  keyEvent: KeyEventFunc<Uint8Array>; // TODO: Needs to use an HTTP API specific type

  /**
   * The address where the HTTP service for the source is listening.
   */
  addr?: ConfigVar<string>;

  /**
   * List of topics to subscribe to.
   */
  topics?: string[];
}

/**
 * HTTP API Source provides connectivity to HTTP endpoints that can serve events
 * on topics using a cursor value to track progress.
 */
export class Source {
  private operators: Operator[];

  /**
   * Creates a new HTTP API source.
   *
   * @param job - The job that will use this source
   * @param id - An identifier for this source
   * @param params - Configuration parameters for the HTTP API source
   */
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

  /**
   * Connects an operator to this source.
   *
   * @param operator - The operator that will process events from this source
   */
  connect(operator: Operator) {
    this.operators.push(operator);
  }
}
