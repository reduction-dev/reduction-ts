import type { ValueCodec } from "@rxn/state/value-codec";
import type { Operator } from "./operator";
import { ValueState } from "@rxn/state/value-state";
import type { Subject } from "@rxn/handler/subject";

export class ValueSpec<T> {
	private codec: ValueCodec<NonNullable<T>>;
	private id: string;
	private defaultValue: T;

  constructor(op: Operator, id: string, codec: ValueCodec<NonNullable<T>>, defaultValue: T) {
		this.id = id;
		this.codec = codec;
		this.defaultValue = defaultValue;	
  }

	public stateFor(subject: Subject): ValueState<T> {
		const cachedState = subject.context.getState(this.id);
		if (cachedState !== undefined) {
			return cachedState as ValueState<T>;
		}

		const state = new ValueState<T>(this.id, this.codec, this.defaultValue, subject.context.getStateEntries(this.id));
		subject.context.putState(this.id, state);
		subject.context.registerStateUse(this.id, state);
		return state;
	}
}
