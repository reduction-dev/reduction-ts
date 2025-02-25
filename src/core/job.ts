import { OperatorHandler, JobDefinition, JobOptions, SourceDefinition, SinkDefinition } from '../types';
import { ReductionHandler } from '../handler';
import { createServer } from 'node:http';
import { 
  JobConfig, 
  Job, 
  Source, 
  Sink, 
  StdioSource, 
  KinesisSource, 
  HTTPAPISource, 
  EmbeddedSource, 
  StdioSink, 
  HTTPAPISink, 
  MemorySink, 
  Framing,
  JobConfigSchema,
  JobSchema,
  SourceSchema,
  SinkSchema,
  StdioSourceSchema,
  KinesisSourceSchema,
  HTTPAPISourceSchema,
  EmbeddedSourceSchema,
  StdioSinkSchema,
  HTTPAPISinkSchema,
  MemorySinkSchema,
  FramingSchema 
} from '../proto/jobconfigpb/jobconfig_pb';
import { create } from '@bufbuild/protobuf';
import { ConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { Handler } from '../proto/handlerpb/handler_pb';
import { 
  ProcessEventBatchRequest, 
  ProcessEventBatchResponse, 
  KeyEventBatchRequest, 
  KeyEventBatchResponse
} from '../proto/handlerpb/handler_pb';

/**
 * The Job class represents a data processing job in the Reduction framework
 */
export class ReductionJob {
  private handler: OperatorHandler;
  private definition: JobDefinition;
  private options: JobOptions;

  /**
   * Create a new job
   * 
   * @param handler The handler to use for this job
   * @param definition The job definition
   * @param options Additional options for the job
   */
  constructor(handler: OperatorHandler, definition: JobDefinition, options: JobOptions = {}) {
    this.handler = handler;
    this.definition = definition;
    this.options = Object.assign({ port: 8080 }, options);

    // Validate the job definition
    this.validateDefinition();
  }

  /**
   * Validate the job definition
   */
  private validateDefinition(): void {
    // Check that we have at least one source and one sink
    if (!this.definition.sources || this.definition.sources.length === 0) {
      throw new Error('Job must have at least one source');
    }

    if (!this.definition.sinks || this.definition.sinks.length === 0) {
      throw new Error('Job must have at least one sink');
    }

    // Check that all sources and sinks have IDs
    for (const source of this.definition.sources) {
      if (!source.id) {
        throw new Error('All sources must have an ID');
      }
    }

    for (const sink of this.definition.sinks) {
      if (!sink.id) {
        throw new Error('All sinks must have an ID');
      }
    }
  }

  /**
   * Create a source configuration
   */
  private createSource(sourceDefinition: SourceDefinition): Source {
    const source = create(SourceSchema, {
      id: sourceDefinition.id
    });

    switch (sourceDefinition.type) {
      case 'stdio':
        source.config = {
          case: 'stdio',
          value: create(StdioSourceSchema, {
            framing: sourceDefinition.config?.framing ? 
              create(FramingSchema, sourceDefinition.config.framing) : 
              create(FramingSchema, {
                scheme: {
                  case: 'lengthEncoded',
                  value: {}
                }
              })
          })
        };
        break;
      case 'kinesis':
        source.config = {
          case: 'kinesis',
          value: create(KinesisSourceSchema, {
            streamArn: sourceDefinition.config?.streamArn,
            endpoint: sourceDefinition.config?.endpoint
          })
        };
        break;
      case 'http_api':
        source.config = {
          case: 'httpApi',
          value: create(HTTPAPISourceSchema, {
            addr: sourceDefinition.config?.addr,
            topics: sourceDefinition.config?.topics || []
          })
        };
        break;
      case 'embedded':
        source.config = {
          case: 'embedded',
          value: create(EmbeddedSourceSchema, {
            splitCount: sourceDefinition.config?.splitCount || 1,
            batchSize: sourceDefinition.config?.batchSize || 10,
            generator: sourceDefinition.config?.generator || 1
          })
        };
        break;
      default:
        throw new Error(`Unknown source type: ${sourceDefinition.type}`);
    }

    return source;
  }

  /**
   * Create a sink configuration
   */
  private createSink(sinkDefinition: SinkDefinition): Sink {
    const sink = create(SinkSchema, {
      id: sinkDefinition.id
    });

    switch (sinkDefinition.type) {
      case 'stdio':
        sink.config = {
          case: 'stdio',
          value: create(StdioSinkSchema, {})
        };
        break;
      case 'http_api':
        sink.config = {
          case: 'httpApi',
          value: create(HTTPAPISinkSchema, {
            addr: sinkDefinition.config?.addr
          })
        };
        break;
      case 'memory':
        sink.config = {
          case: 'memory',
          value: create(MemorySinkSchema, {})
        };
        break;
      default:
        throw new Error(`Unknown sink type: ${sinkDefinition.type}`);
    }

    return sink;
  }

  /**
   * Create the job configuration
   */
  private createJobConfig(): JobConfig {
    const sources = this.definition.sources.map(s => this.createSource(s));
    const sinks = this.definition.sinks.map(s => this.createSink(s));

    return create(JobConfigSchema, {
      job: create(JobSchema, {
        workerCount: this.definition.workerCount || 1,
        keyGroupCount: this.definition.keyGroupCount || 8,
        workingStorageLocation: this.definition.workingStorageLocation || './data',
        savepointStorageLocation: this.definition.savepointStorageLocation || './data'
      }),
      sources: sources,
      sinks: sinks
    });
  }

  /**
   * Output the job configuration
   */
  async outputConfig(): Promise<void> {
    const jobConfig = this.createJobConfig();
    
    // Convert to JSON and output to stdout
    const jsonConfig = JSON.stringify(jobConfig, null, 2);
    console.log(jsonConfig);
  }

  /**
   * Create Connect router for the handler service
   */
  private createRouter(): (router: ConnectRouter) => void {
    const handlerImpl = new ReductionHandler(this.handler);
    
    return (router: ConnectRouter) => {
      router.service(Handler, {
        async processEventBatch(request): Promise<ProcessEventBatchResponse> {
          return await handlerImpl.processEventBatch(request);
        },
        async keyEventBatch(request): Promise<KeyEventBatchResponse> {
          return await handlerImpl.keyEventBatch(request);
        }
      });
    };
  }

  /**
   * Serve the handler
   */
  async serve(): Promise<number> {
    const port = this.options.port ?? 8080;
    const routes = this.createRouter();
    
    // Create a Node HTTP server with Connect adapter
    const server = createServer(
      connectNodeAdapter({ routes })
    );

    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        const actualPort = (server.address() as { port: number }).port;
        console.log(`Handler server listening on port ${actualPort}`);
        resolve(actualPort);
      });

      server.on('error', (err) => {
        reject(err);
      });

      // Handle shutdown
      process.on('SIGINT', () => {
        console.log('Shutting down...');
        server.close(() => {
          process.exit(0);
        });
      });
    });
  }

  /**
   * Run the job with the specified command
   */
  async run(command: string): Promise<void> {
    switch (command) {
      case 'config':
        await this.outputConfig();
        break;
      case 'serve':
        await this.serve();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
