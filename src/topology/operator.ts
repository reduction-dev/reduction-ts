import type { OperatorHandler } from "../types";
import type { Job } from "./job";
import type { BaseSink } from "./sink";

interface OperatorParams {
  parallelism: number;
  handler: (op: Operator) => OperatorHandler;
}

/**
 * The operator which invokes your operator handler.
 */
export class Operator {
  private id: string;
  private params: OperatorParams;
  private sinks: BaseSink[];

  constructor(job: Job, id: string, params: OperatorParams) {
    this.id = id;
    this.params = params;
    this.sinks = [];
    job.context.registerOperator(() => ({
      handler: params.handler(this),
    }));
  }

  connect(sink: BaseSink) {
    this.sinks.push(sink);
  }
}
