import assert from 'assert';
import * as pb from '../proto/handlerpb/handler_pb';
import type { KeyedEvent, KeyEventFunc, OperatorHandler } from "../types";
import { LazySubjectBatch } from "./lazy-subject-batch";
import { timestampDate, timestampFromDate } from '@bufbuild/protobuf/wkt';
import { create } from '@bufbuild/protobuf';

export class SynthesizedHandler {
  private keyEvent: KeyEventFunc;
  private operatorHandler: OperatorHandler;

  constructor(keyEvent: KeyEventFunc,  operatorHandler: OperatorHandler) {
    this.keyEvent = keyEvent;
    this.operatorHandler = operatorHandler;
  }

  KeyEvent(record: Uint8Array): KeyedEvent[] {
    return this.keyEvent(record);
  }

  async ProcessEventBatch(request: pb.ProcessEventBatchRequest): Promise<pb.ProcessEventBatchResponse> {
    assert(request.watermark, "Watermark is required");
    const watermark = timestampDate(request.watermark);
    const batch = new LazySubjectBatch(request.keyStates, watermark);

    for (const { event } of request.events) {
      switch (event.case) {
        case 'keyedEvent': {
          const keyedEvent = event.value;
          assert(keyedEvent.timestamp, "Keyed event timestamp is required");
          const ts = timestampDate(keyedEvent.timestamp);
          const subject = batch.subjectFor(keyedEvent.key, ts);
          this.operatorHandler.onEvent(subject, {
            key: keyedEvent.key,
            value: keyedEvent.value,
            timestamp: ts,
          })
          break;
        }
        case 'timerExpired': {
          const timerExpired = event.value;
          assert(timerExpired.timestamp, "Timer expired timestamp is required");
          const ts = timestampDate(timerExpired.timestamp);
          const subject = batch.subjectFor(timerExpired.key, ts);
          this.operatorHandler.onTimerExpired(subject, ts);
          break;
        }
        default:
          throw new Error(`Unknown event case: ${event.case}`);
      }
    }

    return batch.response();
  }

  async KeyEventBatch(req: { values: Uint8Array[] }): Promise<pb.KeyEventBatchResponse> {
    const results = await Promise.all(
      req.values.map(async (value) => {
        const keyedEvents = await this.KeyEvent(value);
        const events = keyedEvents.map(event => {
          const keyedEvent = create(pb.KeyedEventSchema, {
            key: event.key,
            value: event.value,
            timestamp: timestampFromDate(event.timestamp),
          });
          return keyedEvent;
        });
        
        return create(pb.KeyEventResultSchema, {
          events: events
        });
      })
    );

    return create(pb.KeyEventBatchResponseSchema, {
      results: results
    });
  }
}
