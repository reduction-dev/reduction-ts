import { Server } from '../server/server';
import { JobContext, type JobContextParams } from './job-context';
import { TestRun, type TestRunOptions } from './test-run';
import { program } from 'commander';

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
    this.port = 8080;
  }

  /**
   * Perform a test run against the `reduction testrun` command.
   */
  createTestRun(options?: TestRunOptions): TestRun {
    return new TestRun(this.context.synthesize().handler, options);
  }

  run(): void {
    const { handler, config } = this.context.synthesize();

    program
      .command('config')
      .description('Output the job configuration as JSON')
      .action(() => {
        process.stdout.write(JSON.stringify(config, null, 2));
      });

    program
      .command('start')
      .description('Start the handler server')
      .option('-p, --port <port>', 'The port to listen on', '8080')
      .action(async (options) => {
        this.port = parseInt(options.port);
        this.server = new Server(handler, this.port);
        await this.server.start();
      });

    program.parse(process.argv);
  }
}
