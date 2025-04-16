// @generated by protoc-gen-es v2.2.3 with parameter "target=ts"
// @generated from file jobconfigpb/jobconfig.proto (package dev.reduction.jobconfig, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage } from "@bufbuild/protobuf/codegenv1";
import { fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv1";
import type { Int32Var, StringVar } from "./resolvable_pb";
import { file_jobconfigpb_resolvable } from "./resolvable_pb";
import type { StdioSink, StdioSource } from "./stdio_pb";
import { file_jobconfigpb_stdio } from "./stdio_pb";
import type { KinesisSource } from "./kinesis_pb";
import { file_jobconfigpb_kinesis } from "./kinesis_pb";
import type { HTTPAPISink, HTTPAPISource } from "./httpapi_pb";
import { file_jobconfigpb_httpapi } from "./httpapi_pb";
import type { EmbeddedSource } from "./embedded_pb";
import { file_jobconfigpb_embedded } from "./embedded_pb";
import type { MemorySink } from "./memory_pb";
import { file_jobconfigpb_memory } from "./memory_pb";
import type { KafkaSink, KafkaSource } from "./kafka_pb";
import { file_jobconfigpb_kafka } from "./kafka_pb";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file jobconfigpb/jobconfig.proto.
 */
export const file_jobconfigpb_jobconfig: GenFile = /*@__PURE__*/
  fileDesc("Chtqb2Jjb25maWdwYi9qb2Jjb25maWcucHJvdG8SF2Rldi5yZWR1Y3Rpb24uam9iY29uZmlnIpYBCglKb2JDb25maWcSKQoDam9iGAEgASgLMhwuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuSm9iEjAKB3NvdXJjZXMYAiADKAsyHy5kZXYucmVkdWN0aW9uLmpvYmNvbmZpZy5Tb3VyY2USLAoFc2lua3MYAyADKAsyHS5kZXYucmVkdWN0aW9uLmpvYmNvbmZpZy5TaW5rIuUBCgNKb2ISNwoMd29ya2VyX2NvdW50GAEgASgLMiEuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuSW50MzJWYXISFwoPa2V5X2dyb3VwX2NvdW50GAIgASgFEkQKGHdvcmtpbmdfc3RvcmFnZV9sb2NhdGlvbhgDIAEoCzIiLmRldi5yZWR1Y3Rpb24uam9iY29uZmlnLlN0cmluZ1ZhchJGChpzYXZlcG9pbnRfc3RvcmFnZV9sb2NhdGlvbhgEIAEoCzIiLmRldi5yZWR1Y3Rpb24uam9iY29uZmlnLlN0cmluZ1ZhciLAAgoGU291cmNlEgoKAmlkGAEgASgJEjUKBXN0ZGlvGAIgASgLMiQuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuU3RkaW9Tb3VyY2VIABI5CgdraW5lc2lzGAMgASgLMiYuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuS2luZXNpc1NvdXJjZUgAEjoKCGh0dHBfYXBpGAQgASgLMiYuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuSFRUUEFQSVNvdXJjZUgAEjsKCGVtYmVkZGVkGAUgASgLMicuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuRW1iZWRkZWRTb3VyY2VIABI1CgVrYWZrYRgGIAEoCzIkLmRldi5yZWR1Y3Rpb24uam9iY29uZmlnLkthZmthU291cmNlSABCCAoGY29uZmlnIvcBCgRTaW5rEgoKAmlkGAEgASgJEjMKBXN0ZGlvGAIgASgLMiIuZGV2LnJlZHVjdGlvbi5qb2Jjb25maWcuU3RkaW9TaW5rSAASOAoIaHR0cF9hcGkYAyABKAsyJC5kZXYucmVkdWN0aW9uLmpvYmNvbmZpZy5IVFRQQVBJU2lua0gAEjUKBm1lbW9yeRgEIAEoCzIjLmRldi5yZWR1Y3Rpb24uam9iY29uZmlnLk1lbW9yeVNpbmtIABIzCgVrYWZrYRgFIAEoCzIiLmRldi5yZWR1Y3Rpb24uam9iY29uZmlnLkthZmthU2lua0gAQggKBmNvbmZpZ0IuWixyZWR1Y3Rpb24uZGV2L3JlZHVjdGlvbi1wcm90b2NvbC9qb2Jjb25maWdwYmIGcHJvdG8z", [file_jobconfigpb_resolvable, file_jobconfigpb_stdio, file_jobconfigpb_kinesis, file_jobconfigpb_httpapi, file_jobconfigpb_embedded, file_jobconfigpb_memory, file_jobconfigpb_kafka]);

/**
 * JobConfig is the configuration needed to run a job
 *
 * @generated from message dev.reduction.jobconfig.JobConfig
 */
export type JobConfig = Message<"dev.reduction.jobconfig.JobConfig"> & {
  /**
   * @generated from field: dev.reduction.jobconfig.Job job = 1;
   */
  job?: Job;

  /**
   * @generated from field: repeated dev.reduction.jobconfig.Source sources = 2;
   */
  sources: Source[];

  /**
   * @generated from field: repeated dev.reduction.jobconfig.Sink sinks = 3;
   */
  sinks: Sink[];
};

/**
 * Describes the message dev.reduction.jobconfig.JobConfig.
 * Use `create(JobConfigSchema)` to create a new message.
 */
export const JobConfigSchema: GenMessage<JobConfig> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_jobconfig, 0);

/**
 * Job contains job's parameters
 *
 * @generated from message dev.reduction.jobconfig.Job
 */
export type Job = Message<"dev.reduction.jobconfig.Job"> & {
  /**
   * @generated from field: dev.reduction.jobconfig.Int32Var worker_count = 1;
   */
  workerCount?: Int32Var;

  /**
   * @generated from field: int32 key_group_count = 2;
   */
  keyGroupCount: number;

  /**
   * @generated from field: dev.reduction.jobconfig.StringVar working_storage_location = 3;
   */
  workingStorageLocation?: StringVar;

  /**
   * @generated from field: dev.reduction.jobconfig.StringVar savepoint_storage_location = 4;
   */
  savepointStorageLocation?: StringVar;
};

/**
 * Describes the message dev.reduction.jobconfig.Job.
 * Use `create(JobSchema)` to create a new message.
 */
export const JobSchema: GenMessage<Job> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_jobconfig, 1);

/**
 * Source represents any type of input source
 *
 * @generated from message dev.reduction.jobconfig.Source
 */
export type Source = Message<"dev.reduction.jobconfig.Source"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from oneof dev.reduction.jobconfig.Source.config
   */
  config: {
    /**
     * @generated from field: dev.reduction.jobconfig.StdioSource stdio = 2;
     */
    value: StdioSource;
    case: "stdio";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.KinesisSource kinesis = 3;
     */
    value: KinesisSource;
    case: "kinesis";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.HTTPAPISource http_api = 4;
     */
    value: HTTPAPISource;
    case: "httpApi";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.EmbeddedSource embedded = 5;
     */
    value: EmbeddedSource;
    case: "embedded";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.KafkaSource kafka = 6;
     */
    value: KafkaSource;
    case: "kafka";
  } | { case: undefined; value?: undefined };
};

/**
 * Describes the message dev.reduction.jobconfig.Source.
 * Use `create(SourceSchema)` to create a new message.
 */
export const SourceSchema: GenMessage<Source> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_jobconfig, 2);

/**
 * Sink represents any type of output sink
 *
 * @generated from message dev.reduction.jobconfig.Sink
 */
export type Sink = Message<"dev.reduction.jobconfig.Sink"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from oneof dev.reduction.jobconfig.Sink.config
   */
  config: {
    /**
     * @generated from field: dev.reduction.jobconfig.StdioSink stdio = 2;
     */
    value: StdioSink;
    case: "stdio";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.HTTPAPISink http_api = 3;
     */
    value: HTTPAPISink;
    case: "httpApi";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.MemorySink memory = 4;
     */
    value: MemorySink;
    case: "memory";
  } | {
    /**
     * @generated from field: dev.reduction.jobconfig.KafkaSink kafka = 5;
     */
    value: KafkaSink;
    case: "kafka";
  } | { case: undefined; value?: undefined };
};

/**
 * Describes the message dev.reduction.jobconfig.Sink.
 * Use `create(SinkSchema)` to create a new message.
 */
export const SinkSchema: GenMessage<Sink> = /*@__PURE__*/
  messageDesc(file_jobconfigpb_jobconfig, 3);

