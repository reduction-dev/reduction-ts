import { create } from "@bufbuild/protobuf";
import * as pb from "../../proto/jobconfigpb/jobconfig_pb";
import type { Operator, Job } from "../../topology";
import type { KeyEventFunc } from "../../types";

/**
 * Parameters for creating a stdio source.
 */
export interface StdioSourceParams {
  /**
   * Function that converts event data to KeyedEvents for processing.
   */
  keyEvent: KeyEventFunc;

  /**
   * Optional framing strategy to use for separating records in the input stream.
   */
  framing?: Framing;
}

/**
 * Standard Input/Output Source provides connectivity to read data from stdin.
 * This is useful for development and testing workflows.
 */
export class Source {
  private operators: Operator[];

  /**
   * Creates a new stdio source.
   *
   * @param job - The job that will use this source
   * @param id - An identifier for this source
   * @param params - Configuration parameters for the stdio source
   */
  constructor(job: Job, id: string, params: StdioSourceParams) {
    this.operators = [];

    job.context.registerSource(() => ({
      keyEvent: params.keyEvent,
      operators: this.operators,
      config: create(pb.SourceSchema, {
        id,
        config: {
          case: "stdio",
          value: {
            framing: params.framing?.config(),
          },
        },
      }),
    }));
  }

  /**
   * Connects an operator to this source.
   *
   * @param operator - The operator that will process events from this source
   */
  connect(operator: Operator) {
    this.operators.push(operator);
  }
}

/**
 * Framing configures the strategy for separating records in the input stream.
 * Currently only delimited framing is supported.
 *
 * @example
 *
 * ```
 * // Create a source that reads from stdin
 * const source = new stdio.Source(job, "Source", {
 *   keyEvent,
 *   framing: stdio.Framing.delimited({ delimiter: Buffer.from("\n") }),
 * });
 * ```
 */
export abstract class Framing {
  static delimited(params: { delimiter: Uint8Array }): Framing {
    return new DelimitedFraming(params);
  }

	/**
	 * @internal
	 */
  abstract config(): pb.Framing;
}

class DelimitedFraming extends Framing {
  public delimiter: Uint8Array;
  constructor(params: { delimiter: Uint8Array }) {
    super();
    this.delimiter = params.delimiter;
  }

	/**
	 * @internal
	 */
  config(): pb.Framing {
    return create(pb.FramingSchema, {
      scheme: {
        case: "delimited",
        value: { delimiter: this.delimiter },
      },
    });
  }
}
