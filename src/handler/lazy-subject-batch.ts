import * as pb from "../proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";
import { Subject } from "./subject";
import type { StateEntry } from "../proto/handlerpb/handler_pb";
import type { Temporal } from "temporal-polyfill";

export class LazySubjectBatch {
  private subjects: Map<string, Subject>;
  private state: Map<string, Map<string, StateEntry[]>>;
  private watermark: Temporal.Instant;

  constructor(keyStates: pb.KeyState[], watermark: Temporal.Instant) {
    this.subjects = new Map();
    this.state = new Map();
    this.watermark = watermark;

    // Initialize state map from keyStates
    for (const keyState of keyStates) {
      const keyString = Buffer.from(keyState.key).toString("base64");
      const stateEntries = new Map<string, StateEntry[]>();

      for (const namespace of keyState.stateEntryNamespaces) {
        const entries: StateEntry[] = namespace.entries.map((entry) =>
          create(pb.StateEntrySchema, {
            key: Buffer.from(entry.key),
            value: entry.value,
          })
        );
        stateEntries.set(namespace.namespace, entries);
      }

      this.state.set(keyString, stateEntries);
    }
  }

  subjectFor(key: Uint8Array, timestamp: Temporal.Instant): Subject {
    const keyString = Buffer.from(key).toString("base64");

    const foundSubject = this.subjects.get(keyString);
    if (foundSubject) {
      foundSubject.context.setTimestamp(timestamp);
      return foundSubject;
    }

    const subject = new Subject(key, timestamp, this.watermark, this.stateForKey(key));
    this.subjects.set(keyString, subject);

    return subject;
  }

  response(): pb.ProcessEventBatchResponse {
    const response = create(pb.ProcessEventBatchResponseSchema, {
      sinkRequests: [],
      keyResults: [],
    });

    for (const subject of this.subjects.values()) {
      response.sinkRequests.push(...subject.context.getSinkRequests());
      response.keyResults.push(...subject.context.getKeyResults());
    }

    return response;
  }

  private stateForKey(key: Uint8Array): Map<string, StateEntry[]> {
    const keyString = Buffer.from(key).toString("base64");
    let state = this.state.get(keyString);

    if (!state) {
      state = new Map();
      this.state.set(keyString, state);
    }

    return state;
  }
}
