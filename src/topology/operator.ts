import type { OperatorHandler } from "../types";
import type { Job } from "./job";
import type { BaseSink } from "./base-sink";

interface OperatorParams {
  parallelism: number;
  handler: (op: Operator) => OperatorHandler;
}

/**
 * The operator that invokes your operator handler.
 */
export class Operator {
  private id: string;
  private params: OperatorParams;
  private sinks: BaseSink<unknown>[];

  constructor(job: Job, id: string, params: OperatorParams) {
    this.id = id;
    this.params = params;
    this.sinks = [];
    job.context.registerOperator(() => ({
      handler: params.handler(this),
    }));
  }

  connect(sink: BaseSink<unknown>) {
    this.sinks.push(sink);
  }
}
