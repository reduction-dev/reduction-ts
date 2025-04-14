import type { OperatorHandler } from "../types";
import type { Job } from "./job";
import type { Sink } from "./sink";

/**
 * The parameters for creating an operator.
 */
export interface OperatorParams {
  /**
   * The number of instances of this operator to run.
   */
  parallelism: number;

  /**
   * Returns the handler code that processes events for this operator.
   */
  handler: (op: Operator) => OperatorHandler;
}

/**
 * The component of a Reduction job that invokes your operator handler.
 */
export class Operator {
  private id: string;
  private params: OperatorParams;
  private sinks: Sink<unknown>[];

  /**
   *
   * @param job - The job that this operator is part of
   * @param id  - An identifier for this operator
   * @param params - Other parameters for this operator
   */
  constructor(job: Job, id: string, params: OperatorParams) {
    this.id = id;
    this.params = params;
    this.sinks = [];
    job.context.registerOperator(() => ({
      handler: params.handler(this),
    }));
  }

  /**
   * Connects the downstream sink to the operator.
   * @param sink - The sink to connect to this operator
   */
  connect(sink: Sink<unknown>) {
    this.sinks.push(sink);
  }
}
