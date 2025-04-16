import * as kinesispb from "../../proto/kinesispb/kinesis_pb";
import { create, fromBinary } from "@bufbuild/protobuf";

/**
 * A Kinesis record for use with the Kinesis source and sink.
 */
export class KinesisRecord {
  /** Record timestamp */
  timestamp?: kinesispb.Record["timestamp"];
  /** Record data */
  data: Uint8Array;

  constructor(params: {
    timestamp?: kinesispb.Record["timestamp"];
    data: Uint8Array;
  }) {
    this.timestamp = params.timestamp;
    this.data = params.data;
  }

  /**
   * Create a KinesisRecord from a protobuf kinesispb.Record
   */
  static fromProto(proto: kinesispb.Record): KinesisRecord {
    return new KinesisRecord({
      timestamp: proto.timestamp,
      data: proto.data,
    });
  }

  /**
   * Create a KinesisRecord from a binary buffer
   */
  static fromBinary(data: Uint8Array): KinesisRecord {
    const proto = fromBinary(kinesispb.RecordSchema, data);
    return KinesisRecord.fromProto(proto);
  }

  /**
   * Convert this KinesisRecord to a protobuf kinesispb.Record
   */
  toProto(): kinesispb.Record {
    return create(kinesispb.RecordSchema, {
      timestamp: this.timestamp,
      data: this.data,
    });
  }
}
