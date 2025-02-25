import { OperatorHandler, KeyedEvent } from '../types';
import { SubjectImpl } from './subject';
import * as pb from '../proto/handlerpb/handler_pb';
import { create } from '@bufbuild/protobuf';
import { timestampFromDate, timestampDate } from "@bufbuild/protobuf/wkt";

/**
 * Create a handler for the Reduction engine that implements the Handler service
 */
export class ReductionHandler {
  private operatorHandler: OperatorHandler;
  private keyEventFunc?: (values: Uint8Array[]) => KeyedEvent[] | Promise<KeyedEvent[]>;

  constructor(
    operatorHandler: OperatorHandler, 
    keyEventFunc?: (values: Uint8Array[]) => KeyedEvent[] | Promise<KeyedEvent[]>
  ) {
    this.operatorHandler = operatorHandler;
    this.keyEventFunc = keyEventFunc;
  }

  /**
   * Process a batch of events
   */
  async processEventBatch(request: pb.ProcessEventBatchRequest): Promise<pb.ProcessEventBatchResponse> {
    const keyResults: pb.KeyResult[] = [];
    const processedKeys = new Set<string>();
    const subjects = new Map<string, SubjectImpl>();
    
    // Group events by key
    const keyMap = new Map<string, { 
      key: Uint8Array, 
      events: Event[]
    }>();

    // Group events by key
    for (const event of request.events) {
      let key: Uint8Array;
      if (event.event.case === 'keyedEvent') {
        key = event.event.value.key;
      } else if (event.event.case === 'timerExpired') {
        key = event.event.value.key;
      } else {
        continue;
      }

      const keyStr = Buffer.from(key).toString('base64');
      if (!keyMap.has(keyStr)) {
        keyMap.set(keyStr, { key, events: [] });
      }
      keyMap.get(keyStr)!.events.push(event);
    }

    // Process events for each key
    for (const [keyStr, { key, events }] of keyMap.entries()) {
      const subject = new SubjectImpl(key);
      subjects.set(keyStr, subject);
      processedKeys.add(keyStr);

      for (const event of events) {
        if (event.event.case === 'keyedEvent') {
          // Convert to domain KeyedEvent and call onEvent
          const timestamp = event.event.value.timestamp ? 
            timestampDate(event.event.value.timestamp) : 
            new Date();
            
          await this.operatorHandler.onEvent(subject, {
            key: event.event.value.key,
            value: event.event.value.value,
            timestamp
          });
        } else if (event.event.case === 'timerExpired') {
          // Call onTimerExpired with the timestamp
          const timestamp = event.event.value.timestamp ? 
            timestampDate(event.event.value.timestamp) : 
            new Date();
            
          await this.operatorHandler.onTimerExpired(subject, timestamp);
        }
      }

      // Collect the results
      keyResults.push(create(pb.KeyResultSchema, {
        key: key,
        newTimers: subject.getTimers(),
        stateMutationNamespaces: subject.getStateMutationNamespaces()
      }));
    }

    // Process the key states for any key that wasn't in the events
    for (const keyState of request.keyStates) {
      const keyStr = Buffer.from(keyState.key).toString('base64');
      if (processedKeys.has(keyStr)) {
        continue;
      }

      // Create an empty subject for this key
      const subject = new SubjectImpl(keyState.key);
      subjects.set(keyStr, subject);
      
      // Add the results even if no events were processed
      keyResults.push(create(pb.KeyResultSchema, {
        key: keyState.key,
        newTimers: subject.getTimers(),
        stateMutationNamespaces: subject.getStateMutationNamespaces()
      }));
    }

    // Collect all sink requests from the original subjects
    const sinkRequests = [];
    for (const subject of subjects.values()) {
      sinkRequests.push(...subject.getSinkRequests());
    }

    return create(pb.ProcessEventBatchResponseSchema, {
      keyResults: keyResults,
      sinkRequests: sinkRequests
    });
  }

  /**
   * Process key event batch
   */
  async keyEventBatch(request: pb.KeyEventBatchRequest): Promise<pb.KeyEventBatchResponse> {
    // Process all values together as a batch
    const keyedEvents = await this.keyEventFunc(request.values);
    
    // Convert domain KeyedEvents to proto KeyedEvents
    const protoKeyedEvents = keyedEvents.map(event => 
      create(pb.KeyedEventSchema, {
        key: event.key,
        value: event.value,
        timestamp: timestampFromDate(event.timestamp || new Date())
      })
    );
    
    // Create a single result with all the events
    return create(pb.KeyEventBatchResponseSchema, {
      results: [
        create(pb.KeyEventResultSchema, {
          events: protoKeyedEvents
        })
      ]
    });
  }
}
