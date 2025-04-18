// @generated by protoc-gen-es v2.2.3 with parameter "target=ts"
// @generated from file jobconfigpb/kafka.proto (package dev.reduction.jobconfig, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage } from "@bufbuild/protobuf/codegenv1";
import { fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv1";
import type { StringVar } from "./resolvable_pb";
import { file_jobconfigpb_resolvable } from "./resolvable_pb";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file jobconfigpb/kafka.proto.
 */
export const file_jobconfigpb_kafka: GenFile = /*@__PURE__*/
  fileDesc("Chdqb2Jjb25maWdwYi9rYWZrYS5wcm90bxIXZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcisgEKC0thZmthU291cmNlEjoKDmNvbnN1bWVyX2dyb3VwGAEgASgLMiIuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuU3RyaW5nVmFyEjMKB2Jyb2tlcnMYAiABKAsyIi5kZXYucmVkdWN0aW9uLmpvYmNvbmZpZy5TdHJpbmdWYXISMgoGdG9waWNzGAMgASgLMiIuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuU3RyaW5nVmFyIkAKCUthZmthU2luaxIzCgdicm9rZXJzGAEgASgLMiIuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuU3RyaW5nVmFyQi5aLHJlZHVjdGlvbi5kZXYvcmVkdWN0aW9uLXByb3RvY29sL2pvYmNvbmZpZ3BiYgZwcm90bzM", [file_jobconfigpb_resolvable]);

/**
 * @generated from message dev.reduction.jobconfig.KafkaSource
 */
export type KafkaSource = Message<"dev.reduction.jobconfig.KafkaSource"> & {
  /**
   * The Kafkfa Consumer Group ID
   *
   * @generated from field: dev.reduction.jobconfig.StringVar consumer_group = 1;
   */
  consumerGroup?: StringVar;

  /**
   * Brokers is a comma separated list of broker addresses
   *
   * @generated from field: dev.reduction.jobconfig.StringVar brokers = 2;
   */
  brokers?: StringVar;

  /**
   * Topics is a comma separated list of Kafka topic names
   *
   * @generated from field: dev.reduction.jobconfig.StringVar topics = 3;
   */
  topics?: StringVar;
};

/**
 * Describes the message dev.reduction.jobconfig.KafkaSource.
 * Use `create(KafkaSourceSchema)` to create a new message.
 */
export const KafkaSourceSchema: GenMessage<KafkaSource> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_kafka, 0);

/**
 * @generated from message dev.reduction.jobconfig.KafkaSink
 */
export type KafkaSink = Message<"dev.reduction.jobconfig.KafkaSink"> & {
  /**
   * Brokers is a comma separated list of broker addresses
   *
   * @generated from field: dev.reduction.jobconfig.StringVar brokers = 1;
   */
  brokers?: StringVar;
};

/**
 * Describes the message dev.reduction.jobconfig.KafkaSink.
 * Use `create(KafkaSinkSchema)` to create a new message.
 */
export const KafkaSinkSchema: GenMessage<KafkaSink> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_kafka, 1);

