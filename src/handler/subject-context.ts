import * as pb from '../proto/handlerpb/handler_pb';
import { create } from '@bufbuild/protobuf';
import { type Timestamp, timestampFromDate } from "@bufbuild/protobuf/wkt";

// A map of state IDs to state entries for one key.
type KeyState = Map<string, pb.StateEntry[]>;

// Interface for any state that can provide its mutations
interface MutatingState {
  mutations(): pb.StateMutation[];
}

/**
 * Implementation of the Subject interface for handling state and sinks
 */
export class SubjectContext {
  public readonly key: Uint8Array;
  public readonly watermark: Date;

  private usedStates = new Map<string, MutatingState>();
  private sinkRequests: pb.SinkRequest[] = [];
  private timers: Timestamp[] = [];
  private timestamp: Date;
  private stateCache: Map<string, unknown> = new Map();
  private keyState: KeyState;

  constructor(key: Uint8Array, timestamp: Date, watermark: Date, keyState: KeyState) {
    this.key = key;
    this.timestamp = timestamp;
    this.watermark = watermark;
    this.keyState = keyState;
  }
  registerStateUse(id: string, state: MutatingState): void {
    this.usedStates.set(id, state);
  }

  /**
   * Puts any state type into a cache
   */
  putState(name: string, state: unknown): void {
    this.stateCache.set(name, state); 
  }

  /**
   * Gets and unknown state type from the cache
   */
  getState(name: string): unknown {
    return this.stateCache.get(name);
  }

  getStateEntries(namespace: string): pb.StateEntry[] {
    return this.keyState.get(namespace) || [];
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
    
    // Collect mutations from all used states
    for (const [stateID, state] of this.usedStates) {
      const mutations = state.mutations();
      if (mutations.length > 0) {
        result.push(create(pb.StateMutationNamespaceSchema, {
          namespace: stateID,
          mutations: mutations
        }));
      }
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
