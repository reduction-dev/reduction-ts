import * as kafkapb from "../../proto/kafkapb/kafka_pb";
import { fromBinary } from "@bufbuild/protobuf";

/**
 * A Kafka record for use with the Kafka source and sink.
 */
export class KafkaRecord {
  /** Kafka topic name */
  topic: string;
  /** Kafka partition number */
  partition: number;
  /** Record key */
  key: Uint8Array;
  /** Record value */
  value: Uint8Array;
  /** Record timestamp */
  timestamp: kafkapb.Record["timestamp"];
  /** Record headers */
  headers: { key: string; value: Uint8Array }[];

  constructor(params: {
    topic: string;
    partition: number;
    key: Uint8Array;
    value: Uint8Array;
    timestamp: kafkapb.Record["timestamp"];
    headers?: { key: string; value: Uint8Array }[];
  }) {
    this.topic = params.topic;
    this.partition = params.partition;
    this.key = params.key;
    this.value = params.value;
    this.timestamp = params.timestamp;
    this.headers = params.headers ?? [];
  }

  /**
   * Create a Record from a binary buffer
   */
  static fromBinary(data: Uint8Array): KafkaRecord {
    const proto = fromBinary(kafkapb.RecordSchema, data);
    return new KafkaRecord({
      topic: proto.topic,
      partition: proto.partition,
      key: proto.key,
      value: proto.value,
      timestamp: proto.timestamp,
      headers: proto.headers?.map(h => ({ key: h.key, value: h.value })) ?? [],
    });
  }
}
