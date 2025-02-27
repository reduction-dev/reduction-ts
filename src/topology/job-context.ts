import { SynthesizedHandler } from "../handler/synthesized-handler";
import type { KeyEventFunc, OperatorHandler } from "../types";
import * as config_pb from '../proto/jobconfigpb/jobconfig_pb';
import type { Operator } from "./operator";
import { create, toJson } from "@bufbuild/protobuf";

export interface JobContextParams {
  workerCount?: number;
  keyGroupCount?: number;
  workingStorageLocation: string;
  savepointStorageLocation?: string;
  port?: number;
}

interface JobSynthesis {
  handler: SynthesizedHandler;
  config: any;
}

interface SourceSynthesis {
  keyEvent: KeyEventFunc;
  operators: Operator[];
  config: config_pb.Source;
}

type LazySourceSynthesis = () => SourceSynthesis;

interface OperatorSynthesis {
  handler: OperatorHandler;
}

type LazyOperatorSynthesis = () => OperatorSynthesis;

interface SinkSynthesis {
  config: config_pb.Sink;
}

type LazySinkSynthesis = () => SinkSynthesis;

/**
 * JobContext is an internal object passed within the job topology to register
 * sources, sinks, and operators.
 */
export class JobContext {
  private workerCount: number;
  private keyGroupCount: number;
  private workingStorageLocation: string;
  private savepointStorageLocation: string;
  private sources: LazySourceSynthesis[];
  private sinks: LazySinkSynthesis[];
  private operators: LazyOperatorSynthesis[];

  constructor(params: JobContextParams) {
    this.workerCount = params.workerCount ?? 1;
    this.keyGroupCount = params.keyGroupCount ?? 8;
    this.workingStorageLocation = params.workingStorageLocation;
    this.savepointStorageLocation = params.savepointStorageLocation ?? params.workingStorageLocation + '/savepoints';
    this.sources = [];
    this.sinks = [];
    this.operators = [];
  }

  public synthesize(): JobSynthesis {
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
        workerCount: this.workerCount,
        keyGroupCount: this.keyGroupCount,
        savepointStorageLocation: this.savepointStorageLocation,
        workingStorageLocation: this.workingStorageLocation
      }),
      sources: [source.config],
      sinks: [sink.config]
    });

    return {
      handler: new SynthesizedHandler(source.keyEvent, operator.handler),
      config: toJson(config_pb.JobConfigSchema, jobConfig),
    }
  }

  public registerSource(source: LazySourceSynthesis): void {
    this.sources.push(source);
  }

  public registerSink(sink: LazySinkSynthesis): void {
    this.sinks.push(sink);
  }

  public registerOperator(operator: LazyOperatorSynthesis): void {
    this.operators.push(operator);
  }
}
