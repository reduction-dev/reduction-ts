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

    const source = this.sources[0]()
    const operator = this.operators[0]();

    const jobConfig = create(config_pb.JobConfigSchema, {
      job: create(config_pb.JobSchema, {
        workerCount: this.workerCount,
        keyGroupCount: this.keyGroupCount,
        savepointStorageLocation: this.savepointStorageLocation,
        workingStorageLocation: this.workingStorageLocation
      }),
      sources: [source.config],
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

  // private createSource(sourceDefinition: SourceDefinition): config_pb.Source {
  //   const source = create(config_pb.SourceSchema, {
  //     id: sourceDefinition.id
  //   });

  //   switch (sourceDefinition.type) {
  //     case 'stdio':
  //       source.config = {
  //         case: 'stdio',
  //         value: create(config_pb.StdioSourceSchema, {
  //           framing: sourceDefinition.config?.framing ? 
  //             create(config_pb.FramingSchema, sourceDefinition.config.framing) : 
  //             create(config_pb.FramingSchema, {
  //               scheme: {
  //                 case: 'lengthEncoded',
  //                 value: {}
  //               }
  //             })
  //         })
  //       };
  //       break;
  //     case 'kinesis':
  //       source.config = {
  //         case: 'kinesis',
  //         value: create(config_pb.KinesisSourceSchema, {
  //           streamArn: sourceDefinition.config?.streamArn,
  //           endpoint: sourceDefinition.config?.endpoint
  //         })
  //       };
  //       break;
  //     case 'http_api':
  //       source.config = {
  //         case: 'httpApi',
  //         value: create(config_pb.HTTPAPISourceSchema, {
  //           addr: sourceDefinition.config?.addr,
  //           topics: sourceDefinition.config?.topics || []
  //         })
  //       };
  //       break;
  //     case 'embedded':
  //       source.config = {
  //         case: 'embedded',
  //         value: create(config_pb.EmbeddedSourceSchema, {
  //           splitCount: sourceDefinition.config?.splitCount || 1,
  //           batchSize: sourceDefinition.config?.batchSize || 10,
  //           generator: sourceDefinition.config?.generator || 1
  //         })
  //       };
  //       break;
  //     default:
  //       throw new Error(`Unknown source type: ${sourceDefinition.type}`);
  //   }

  //   return source;
  // }

  /**
   * Create a sink configuration
   */
  // private createSink(sinkDefinition: SinkDefinition): config_pb.Sink {
  //   const sink = create(config_pb.SinkSchema, {
  //     id: sinkDefinition.id
  //   });

  //   switch (sinkDefinition.type) {
  //     case 'stdio':
  //       sink.config = {
  //         case: 'stdio',
  //         value: create(config_pb.StdioSinkSchema, {})
  //       };
  //       break;
  //     case 'http_api':
  //       sink.config = {
  //         case: 'httpApi',
  //         value: create(config_pb.HTTPAPISinkSchema, {
  //           addr: sinkDefinition.config?.addr
  //         })
  //       };
  //       break;
  //     case 'memory':
  //       sink.config = {
  //         case: 'memory',
  //         value: create(config_pb.MemorySinkSchema, {})
  //       };
  //       break;
  //     default:
  //       throw new Error(`Unknown sink type: ${sinkDefinition.type}`);
  //   }

  //   return sink;
  // }
}
