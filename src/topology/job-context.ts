import { SynthesizedHandler } from "../handler/synthesized-handler";
import type { KeyedEvent, OperatorHandler } from "../types";
import * as config_pb from '../proto/jobconfigpb/jobconfig_pb';
import type { Operator } from "./operator";
import { create, toJson, type JsonValue } from "@bufbuild/protobuf";
import { int32VarProto, stringVarProto, type ConfigVar } from "./config-var";

export interface JobContextParams {
  /**
   * The number of workers to use for the job.
   */
  workerCount?: ConfigVar<number>;

  /**
   * The number of key groups to use as the upper bound of possible partitions.
   * Prefer using the default value unless you have a specific reason to change
   * it.
   */
  keyGroupCount?: number;

  workingStorageLocation: ConfigVar<string>;
  savepointStorageLocation?: ConfigVar<string>;
}

interface SourceSynthesis {
  keyEvent: (data: Uint8Array) => KeyedEvent[];
  operators: Operator[];
  config: config_pb.Source;
}

interface OperatorSynthesis {
  handler: OperatorHandler;
}

interface SinkSynthesis {
  config: config_pb.Sink;
}

type Lazy<T> = () => T

/**
 * JobContext is an internal object passed within the job topology to register
 * sources, sinks, and operators.
 */
export class JobContext {
  private sources: Lazy<SourceSynthesis>[];
  private sinks: Lazy<SinkSynthesis>[];
  private operators: Lazy<OperatorSynthesis>[];
  private jobParams: JobContextParams

  constructor(params: JobContextParams) {
    this.jobParams = params;
    this.sources = [];
    this.sinks = [];
    this.operators = [];
  }

  public synthesize(): { handler: SynthesizedHandler, config: JsonValue } {
    if (this.sources.length !== 1) {
      throw new Error('Job must have exactly one source');
    }

    if (this.operators.length !== 1) {
      throw new Error('Job must have exactly one operator');
    }

    if (this.sinks.length !== 1) {
      throw new Error('Job must have exactly one sink');
    }

    const source = this.sources[0]();
    const sink = this.sinks[0]();
    const operator = this.operators[0]();

    const jobConfig = create(config_pb.JobConfigSchema, {
      job: create(config_pb.JobSchema, {
        workerCount: int32VarProto(this.jobParams.workerCount),
        keyGroupCount: this.jobParams.keyGroupCount,
        workingStorageLocation: stringVarProto(this.jobParams.workingStorageLocation),
        savepointStorageLocation: stringVarProto(this.jobParams.savepointStorageLocation),
      }),
      sources: [source.config],
      sinks: [sink.config]
    });

    return {
      handler: new SynthesizedHandler(source.keyEvent, operator.handler),
      config: toJson(config_pb.JobConfigSchema, jobConfig),
    }
  }

  public registerSource(source: Lazy<SourceSynthesis>): void {
    this.sources.push(source);
  }

  public registerSink(sink: Lazy<SinkSynthesis>): void {
    this.sinks.push(sink);
  }

  public registerOperator(operator: Lazy<OperatorSynthesis>): void {
    this.operators.push(operator);
  }
}
