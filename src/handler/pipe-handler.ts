import { fromBinary, toBinary } from "@bufbuild/protobuf";
import * as handlerpb from "@rxn/proto/handlerpb/handler_pb";
import * as pb from "@rxn/proto/testrunpb/testrun_pb";
import assert from "node:assert";
import { Readable, Transform, type TransformCallback, Writable } from "node:stream";
import type { SynthesizedHandler } from "./synthesized-handler";

export class PipeHandler {
  private rxnHandler: SynthesizedHandler;
  private stdin: Readable;
  private stdout: Writable;
  private messageReader: LengthPrefixedMessageReader;
  private messageWriter: LengthPrefixedMessageWriter;
  
  constructor(handler: SynthesizedHandler, stdin: Readable, stdout: Writable) {
    this.rxnHandler = handler;
    this.stdin = stdin;
    this.stdout = stdout;
    
    // Create the message transforms
    this.messageReader = new LengthPrefixedMessageReader();
    this.messageWriter = new LengthPrefixedMessageWriter();
    
    // Connect the writer transform to stdout
    this.messageWriter.pipe(this.stdout);
  }

  public async processMessages(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Pipe stdin through our message reader
      this.stdin
        .pipe(this.messageReader)
        .on('data', async (data: Buffer) => {
          try {
            // Process each message as it arrives
            await this.processMessage(new Uint8Array(data));
          } catch (err) {
            reject(err);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  private async processMessage(data: Uint8Array): Promise<void> {
    const cmd = fromBinary(pb.HandlerCommandSchema, data);
    
    switch (cmd.command.case) {
      case 'keyEventBatch': {
        const req = cmd.command.value.keyEventBatchRequest;
        assert(req, 'keyEventBatchRequest is required');
        await this.handleKeyEventBatch(req);
        break;
      }
      case 'processEventBatch': {
        const req = cmd.command.value.processEventBatchRequest;
        assert(req, 'processEventBatchRequest is required');
        await this.handleProcessEventBatch(req);
        break;
      }
      default:
        throw new Error(`Unknown command type: ${cmd.command.case}`);
    }
  }

  private async handleKeyEventBatch(req: handlerpb.KeyEventBatchRequest): Promise<void> {
    try {
      const resp = await this.rxnHandler.KeyEventBatch(req);
      await this.writeResponse(toBinary(handlerpb.KeyEventBatchResponseSchema, resp));
    } catch (err) {
      throw new Error(`Failed to handle KeyEventBatch: ${err}`);
    }
  }

  private async handleProcessEventBatch(req: handlerpb.ProcessEventBatchRequest): Promise<void> {
    try {
      const resp = await this.rxnHandler.ProcessEventBatch(req);
      await this.writeResponse(toBinary(handlerpb.ProcessEventBatchResponseSchema, resp));
    } catch (err) {
      throw new Error(`Failed to handle ProcessEventBatch: ${err}`);
    }
  }

  /**
   * Write a length-prefixed message to stdout using the transform stream
   */
  private async writeResponse(message: Uint8Array): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.messageWriter.write(message, (err) => {
        if (err) {
          reject(new Error(`Failed to write response: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

// Transform stream that extracts length-prefixed messages
class LengthPrefixedMessageReader extends Transform {
  private buffer: Buffer = Buffer.alloc(0);
  private expectedLength: number | null = null;
  private headerSize = 4; // 4 bytes for uint32

  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    // Append the new chunk to our buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Process as many complete messages as possible
    while (this.buffer.length > 0) {
      // If we don't know the message length yet, try to read it
      if (this.expectedLength === null) {
        if (this.buffer.length < this.headerSize) {
          // Not enough data to read header, wait for more
          break;
        }
        this.expectedLength = this.buffer.readUInt32BE(0);
      }

      const totalExpectedLength = this.headerSize + this.expectedLength;
      
      // Check if we have a complete message
      if (this.buffer.length < totalExpectedLength) {
        // Not enough data for complete message, wait for more
        break;
      }

      // Extract the message (skipping the length header)
      const message = this.buffer.subarray(this.headerSize, totalExpectedLength);
      
      // Push the message downstream
      this.push(message);

      // Remove the processed message from the buffer
      this.buffer = this.buffer.subarray(totalExpectedLength);
      
      // Reset expected length for next message
      this.expectedLength = null;
    }
    
    callback();
  }
}

// Transform stream that adds length prefix to messages
class LengthPrefixedMessageWriter extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: Uint8Array, encoding: string, callback: TransformCallback) {
    const data = Buffer.from(chunk);
    
    // Create a length header (4 bytes for uint32)
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);
    
    // Push the length header followed by the data
    this.push(Buffer.concat([lengthBuffer, data]));
    callback();
  }
}
