import * as pb from '../proto/handlerpb/handler_pb';
import { create } from '@bufbuild/protobuf';
import { type Timestamp, timestampFromDate } from "@bufbuild/protobuf/wkt";

// A map of state IDs to state entries for one key.
type KeyState = Map<string, StateEntry[]>;

export interface StateEntry {
  key: Uint8Array;
  value: any;
}

/**
 * Implementation of the Subject interface for handling state and sinks
 */
export class SubjectContext {
  private stateMutations: Map<string, Map<string, { put?: pb.PutMutation; delete?: pb.DeleteMutation }>> = new Map();
  private sinkRequests: pb.SinkRequest[] = [];
  private timers: Timestamp[] = [];
  private readonly key: Uint8Array;
  private timestamp: Date;
  private watermark: Date;
  private stateCache: Map<string, unknown> = new Map();
  private keyState: KeyState;

  constructor(key: Uint8Array, timestamp: Date, watermark: Date, keyState: KeyState) {
    this.key = key;
    this.timestamp = timestamp;
    this.watermark = watermark;
    this.keyState = keyState;
  }

  putState(name: string, state: unknown): void {
    this.stateCache.set(name, state); 
  }

  getState(name: string): unknown {
    return this.stateCache.get(name);
  }

  getStateEntries(namespace: string): StateEntry[] {
    return this.keyState.get(namespace) || [];
  }

  // putState(namespace: string, key: Uint8Array, value: Uint8Array): void {
  //   if (!this.stateMutations.has(namespace)) {
  //     this.stateMutations.set(namespace, new Map());
  //   }
    
  //   const keyStr = Buffer.from(key).toString('base64');
  //   const namespaceMap = this.stateMutations.get(namespace)!;
    
  //   const putMutation = create(pb.PutMutationSchema, {
  //     key: key,
  //     value: value
  //   });
    
  //   namespaceMap.set(keyStr, { put: putMutation });
  // }

  deleteState(namespace: string, key: Uint8Array): void {
    if (!this.stateMutations.has(namespace)) {
      this.stateMutations.set(namespace, new Map());
    }
    
    const keyStr = Buffer.from(key).toString('base64');
    const namespaceMap = this.stateMutations.get(namespace)!;
    
    const deleteMutation = create(pb.DeleteMutationSchema, {
      key: key
    });
    
    namespaceMap.set(keyStr, { delete: deleteMutation });
  }

  emit(sinkId: string, value: Uint8Array): void {
    this.sinkRequests.push(create(pb.SinkRequestSchema, {
      id: sinkId,
      value: value
    }));
  }

  setTimer(timestamp: Date): void {
    this.timers.push(timestampFromDate(timestamp));
  }

  setTimestamp(timestamp: Date): void {
    this.timestamp = timestamp;
  }

  getStateMutationNamespaces(): pb.StateMutationNamespace[] {
    const result: pb.StateMutationNamespace[] = [];
    
    for (const [namespace, mutations] of this.stateMutations.entries()) {
      // First create each mutation
      const stateMutations: pb.StateMutation[] = [];
      
      for (const mutation of mutations.values()) {
        if (mutation.put) {
          stateMutations.push(create(pb.StateMutationSchema, {
            mutation: {
              case: "put",
              value: mutation.put
            }
          }));
        } else if (mutation.delete) {
          stateMutations.push(create(pb.StateMutationSchema, {
            mutation: {
              case: "delete",
              value: mutation.delete
            }
          }));
        }
      }
      
      // Then add them to the namespace
      const mutationNamespace = create(pb.StateMutationNamespaceSchema, {
        namespace: namespace,
        mutations: stateMutations
      });
      
      result.push(mutationNamespace);
    }
    
    return result;
  }

  getSinkRequests(): pb.SinkRequest[] {
    return this.sinkRequests;
  }

  addSinkRequest(id: string, value: Uint8Array): void {
    this.sinkRequests.push(create(pb.SinkRequestSchema, {
      id,
      value
    }));
  }

  getTimers(): Timestamp[] {
    return this.timers;
  }

  getKey(): Uint8Array {
    return this.key;
  }

  getKeyResults(): pb.KeyResult[] {
    const result = create(pb.KeyResultSchema, {
      key: this.key,
      newTimers: this.timers
    });

    // Add state mutation namespaces to the result
    result.stateMutationNamespaces = this.getStateMutationNamespaces();

    return [result];
  }
}
