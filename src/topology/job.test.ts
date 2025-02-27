import { expect, test } from 'bun:test';
import * as topology from '../topology';
import * as stdio from '../connectors/stdio';

test("synthesize job config", () => {
  const job = new topology.Job({ 
    workerCount: 1,
    keyGroupCount: 2,
    workingStorageLocation: "/tmp/work",
    savepointStorageLocation: "/tmp/save"
  });

  const sink = new stdio.Sink(job, "sink-id");
  const source = new stdio.Source(job, "source-id", {
    keyEvent: (event) => {
      return [{
        key: Uint8Array.from("test-key"),
        value: event,
        timestamp: new Date(),
      }];
    }
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


  const synth = job.context.synthesize(); 
});
