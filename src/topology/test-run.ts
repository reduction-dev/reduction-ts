import { create, toBinary } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { PipeHandler } from "@rxn/handler/pipe-handler";
import type { SynthesizedHandler } from "@rxn/handler/synthesized-handler";
import * as pb from "@rxn/proto/testrunpb/testrun_pb";
import { spawn } from "node:child_process";

export class TestRun {
  private handler: SynthesizedHandler
  private commandBuffer: Buffer

  constructor(handler: SynthesizedHandler) {
    this.handler = handler
    this.commandBuffer = Buffer.alloc(0)
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

  public addWatermark(watermark: Date): void {
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
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    // Write the command buffer to stdin
    process.stdin.write(this.commandBuffer);
    process.stdin.end();
    
    // Handle potential errors from the process
    process.on('error', (err) => {
      throw new Error(`Failed to execute command: ${err.message}`);
    });

    // Create the pipe handler to manage the communication
    const pipeHandler = new PipeHandler(this.handler, process.stdout, process.stdin);
    pipeHandler.processMessages();
    
    // Return a promise that resolves when the process completes
    return new Promise<void>((resolve, reject) => {
      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }

  private addCommand(command: pb.RunnerCommand): void {
    const binMsg = toBinary(pb.RunnerCommandSchema, command);
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(binMsg.length, 0);
    this.commandBuffer = Buffer.concat([this.commandBuffer, lengthBuffer, binMsg]);
  }
}
