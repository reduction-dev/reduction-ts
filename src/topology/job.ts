import { Server } from '../server/server';
import { JobContext, type JobContextParams } from './job-context';

export type JobParams = JobContextParams;

/**
 * The Job class represents a data processing job in the Reduction framework.
 */
export class Job {
  public context: JobContext;
  private port: number;
  private server?: Server;

  constructor(params: JobParams) {
    this.context = new JobContext(params)
    this.port = params.port ?? 8080;
  }

  /**
   * Run the job with the specified command
   */
  async run(command: string): Promise<void> {
    const { handler, config } = this.context.synthesize();
    switch (command) {
      case 'config':
        // Convert to JSON and output to stdout
        const jsonConfig = JSON.stringify(config, null, 2);
        console.log(jsonConfig);
        break;
      case 'serve':
        this.server = new Server(handler, this.port);
        await this.server.start();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
