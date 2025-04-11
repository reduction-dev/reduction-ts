import { create } from '@bufbuild/protobuf';
import * as pb from '../../proto/jobconfigpb/jobconfig_pb';
import type { Operator, Job } from '../../topology';
import type { KeyEventFunc } from '../../types';

export interface StdioSourceParams {
  keyEvent: KeyEventFunc;
  framing?: Framing;
}

export class Source {
	private operators: Operator[];

	constructor(job: Job, id: string, params: StdioSourceParams) {
		this.operators = [];

		job.context.registerSource(() => ({
			keyEvent: params.keyEvent,
			operators: this.operators,
			config: create(pb.SourceSchema, {
				id,
				config: {
					case: 'stdio',
					value: {
						framing: params.framing?.config(),
					},
				},
			}),
		}));
	}

	connect(operator: Operator) {
		this.operators.push(operator);
	}
}

export class Framing {
	static delimited(params: { delimiter: Uint8Array }): Framing {
		return new DelimitedFraming(params);
	}

	config(): pb.Framing {
		throw new Error('Not implemented');
	}
}

class DelimitedFraming extends Framing {
	public delimiter: Uint8Array<ArrayBufferLike>;
	constructor(params: { delimiter: Uint8Array }) {
		super();
		this.delimiter = params.delimiter;
	}

	config(): pb.Framing {
		return create(pb.FramingSchema, {
			scheme: {
				case: 'delimited',
				value: { delimiter: this.delimiter },
			},
		});
	}
}
