import * as pb from '../proto/handlerpb/handler_pb';
import { create } from '@bufbuild/protobuf';
import { SubjectImpl, type StateEntry } from './subject';

export class LazySubjectBatch {
  private subjects: Map<string, SubjectImpl>;
  private state: Map<string, Map<string, StateEntry[]>>;
  private watermark: Date;

  constructor(keyStates: pb.KeyState[], watermark: Date) {
    this.subjects = new Map();
    this.state = new Map();
    this.watermark = watermark;

    // Initialize state map from keyStates
    for (const keyState of keyStates) {
      const keyString = Buffer.from(keyState.key).toString('base64');
      const stateEntries = new Map<string, StateEntry[]>();
      
      for (const namespace of keyState.stateEntryNamespaces) {
        const entries: StateEntry[] = namespace.entries.map(entry => ({
          key: Buffer.from(entry.key).toString('base64'),
          value: entry.value
        }));
        stateEntries.set(namespace.namespace, entries);
      }
      
      this.state.set(keyString, stateEntries);
    }
  }

  subjectFor(key: Uint8Array, timestamp: Date): SubjectImpl {
    const keyString = Buffer.from(key).toString('base64');
    
    const foundSubject = this.subjects.get(keyString);
    if (foundSubject) {
      foundSubject.setTimestamp(timestamp);
      return foundSubject;
    }

    const subject = new SubjectImpl(key, timestamp, this.watermark, this.stateForKey(key));
    this.subjects.set(keyString, subject);

    return subject;
  }

  response(): pb.ProcessEventBatchResponse {
    const response = create(pb.ProcessEventBatchResponseSchema, {
      sinkRequests: [],
      keyResults: [],
    });

    for (const subject of this.subjects.values()) {
      response.sinkRequests.push(...subject.getSinkRequests());
      response.keyResults.push(...subject.getKeyResults());
    }

    return response;
  }

  private stateForKey(key: Uint8Array): Map<string, StateEntry[]> {
    const keyString = Buffer.from(key).toString();
    let state = this.state.get(keyString);
    
    if (!state) {
      state = new Map();
      this.state.set(keyString, state);
    }
    
    return state;
  }
}
