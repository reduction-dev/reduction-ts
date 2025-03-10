// @generated by protoc-gen-es v2.2.3 with parameter "target=ts"
// @generated from file kinesispb/kinesis.proto (package dev.reduction.kinesis, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage } from "@bufbuild/protobuf/codegenv1";
import { fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv1";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { file_google_protobuf_timestamp } from "@bufbuild/protobuf/wkt";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file kinesispb/kinesis.proto.
 */
export const file_kinesispb_kinesis: GenFile = /*@__PURE__*/
  fileDesc("ChdraW5lc2lzcGIva2luZXNpcy5wcm90bxIVZGV2LnJlZHVjdGlvbi5raW5lc2lzIkUKBlJlY29yZBItCgl0aW1lc3RhbXAYASABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEgwKBGRhdGEYAiABKAxCLFoqcmVkdWN0aW9uLmRldi9yZWR1Y3Rpb24tcHJvdG9jb2wva2luZXNpc3BiYgZwcm90bzM", [file_google_protobuf_timestamp]);

/**
 * @generated from message dev.reduction.kinesis.Record
 */
export type Record = Message<"dev.reduction.kinesis.Record"> & {
  /**
   * @generated from field: google.protobuf.Timestamp timestamp = 1;
   */
  timestamp?: Timestamp;

  /**
   * @generated from field: bytes data = 2;
   */
  data: Uint8Array;
};

/**
 * Describes the message dev.reduction.kinesis.Record.
 * Use `create(RecordSchema)` to create a new message.
 */
export const RecordSchema: GenMessage<Record> = /*@__PURE__*/
  messageDesc(file_kinesispb_kinesis, 0);

