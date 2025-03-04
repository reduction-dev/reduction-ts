import { create, toBinary } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PipeHandler } from "../handler/pipe-handler";
import type { SynthesizedHandler } from "../handler/synthesized-handler";
import * as pb from "../proto/testrunpb/testrun_pb";

export interface TestRunOptions {
  /**
   * If true, the test run will print messages from the reduction process.
   * @default false
   */
  verbose?: boolean;
}

export class TestRun {
  private handler: SynthesizedHandler
  private commandBuffer: Buffer
  private verbose: boolean;

  constructor(handler: SynthesizedHandler, options?: TestRunOptions) {
    this.handler = handler
    this.commandBuffer = Buffer.alloc(0)
    this.verbose = options?.verbose ?? false;
  }

  public addRecord(record: Buffer): void {
    const keyedEvents = this.handler.KeyEvent(record)
    for (const keyedEvent of keyedEvents) {
      this.addCommand(create(pb.RunnerCommandSchema, {
        command: {
          case: 'addKeyedEvent',
          value: {
            keyedEvent: {
              key: keyedEvent.key,
              value: keyedEvent.value,
              timestamp: timestampFromDate(keyedEvent.timestamp),
            }
          }
        }
      }));
    }
  }

  public addWatermark(): void {
    this.addCommand(create(pb.RunnerCommandSchema, {
      command: {
        case: 'addWatermark',
        value: {},
      }
    }));
  }

  public async run(): Promise<void> {
    this.addCommand(create(pb.RunnerCommandSchema, {
      command: {
        case: 'run',
        value: {},
      }
    }));

    const process = spawn('reduction', ['testrun'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Create a promise that handles errors and exiting.
    const processPromise = new Promise<void>((resolve, reject) => {
      let stderrOutput = '';
      process.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      process.on('error', (err) => {
        printLogs(stderrOutput);
        return reject(new Error(`Failed to execute command: ${err.message}`));
      });
      process.on('exit', (code) => {
        if (code === 0) {
          if (this.verbose) {
            printLogs(stderrOutput);
          }
          resolve();
        } else {
          printLogs(stderrOutput);
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
    
    // Write the command buffer to stdin
    await pipeline(Readable.from(this.commandBuffer), process.stdin, { end: false });

    // Create the pipe handler to manage the communication
    const pipeHandler = new PipeHandler(this.handler, process.stdout, process.stdin);
    await pipeHandler.processMessages();
    
    // Wait for process to exit
    await processPromise;
  }

  private addCommand(command: pb.RunnerCommand): void {
    const binMsg = toBinary(pb.RunnerCommandSchema, command);
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(binMsg.length, 0);
    this.commandBuffer = Buffer.concat([this.commandBuffer, lengthBuffer, binMsg]);
  }
}

function printLogs(logs: string): void {
  console.log("Reduction testrun logs:");
  console.log(logs);
}
