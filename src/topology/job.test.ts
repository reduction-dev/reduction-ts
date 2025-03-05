import { expect, test } from 'bun:test';
import * as topology from '../topology';
import * as stdio from '../connectors/stdio';
import { fromJson } from '@bufbuild/protobuf';
import { create } from '@bufbuild/protobuf';
import * as config_pb from '../proto/jobconfigpb/jobconfig_pb';
import { currentInstant } from '../instant';

test("synthesize job config", () => {
  const job = new topology.Job({
    workerCount: 1,
    keyGroupCount: 2,
    workingStorageLocation: "/tmp/work",
    savepointStorageLocation: "/tmp/save"
  });
  const sink = new stdio.Sink(job, "sink-id");
  const source = new stdio.Source(job, "source-id", {
    keyEvent: (event) => (
      [{
        key: Uint8Array.from("test-key"),
        value: event,
        timestamp: currentInstant(),
      }]
    )
  });
  const operator = new topology.Operator(job, "operator-id", {
    parallelism: 1,
    handler(op) {
      return {
        onEvent(event) {},
        onTimerExpired() {},
      };
    },
  });
  source.connect(operator);
  operator.connect(sink);

  const { config } = job.context.synthesize();
  const pbConfig = fromJson(config_pb.JobConfigSchema, config);

  // Create the expected configuration
  expect(pbConfig).toEqual(create(config_pb.JobConfigSchema, {
    job: {
      workerCount: 1,
      keyGroupCount: 2,
      workingStorageLocation: "/tmp/work",
      savepointStorageLocation: "/tmp/save"
    },
    sources: [{
      id: "source-id",
      config: {
        case: "stdio",
        value: {},
      },
    }],
    sinks: [{
      id: "sink-id",
      config: {
        case: "stdio",
        value: {},
      }
    }],
  }));
});
