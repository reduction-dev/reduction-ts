import type { ConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createServer, Server as HttpServer } from 'node:http';
import { SynthesizedHandler } from '../handler/synthesized-handler';
import * as handler_pb from '../proto/handlerpb/handler_pb';
import { Handler } from '../proto/handlerpb/handler_pb';

export class Server {
  private handler: SynthesizedHandler;
  private port: number;
  private httpServer?: HttpServer;

  constructor(handler: SynthesizedHandler, port: number = 8080) {
    this.handler = handler;
    this.port = port;
  }

  private createRouter(): (router: ConnectRouter) => void {
    const handler = this.handler;
    return (router: ConnectRouter) => {
      router.service(Handler, {
        async processEventBatch(request): Promise<handler_pb.ProcessEventBatchResponse> {
          return handler.ProcessEventBatch(request);
        },
        async keyEventBatch(request): Promise<handler_pb.KeyEventBatchResponse> {
          return handler.KeyEventBatch(request);
        }
      });
    };
  }

  async start(): Promise<number> {
    const routes = this.createRouter();
    
    this.httpServer = createServer(
      connectNodeAdapter({ routes })
    );

    return new Promise((resolve, reject) => {
      this.httpServer?.listen(this.port, () => {
        const actualPort = (this.httpServer?.address() as { port: number }).port;
        console.log(`Handler server listening on port ${actualPort}`);
        resolve(actualPort);
      });

      this.httpServer?.on('error', (err) => {
        reject(err);
      });

      // Handle shutdown
      process.on('SIGINT', () => {
        this.stop();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Shutting down server...');
      this.httpServer?.close(() => {
        resolve();
      });
    });
  }
}
