import type { OperatorHandler } from "../types";
import type { Job } from "./job";
import type { Sink } from "./sink";

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
  private sinks: Sink<unknown>[];

  constructor(job: Job, id: string, params: OperatorParams) {
    this.id = id;
    this.params = params;
    this.sinks = [];
    job.context.registerOperator(() => ({
      handler: params.handler(this),
    }));
  }

  connect(sink: Sink<unknown>) {
    this.sinks.push(sink);
  }
}
