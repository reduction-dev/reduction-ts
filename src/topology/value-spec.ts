import type { Operator } from "./operator";
import { ValueState, type ValueCodec } from "../state";
import type { Subject } from "../handler/subject";

/**
 * A specification for value state used by an operator.
 *
 * @typeParam T - The type of value stored in the state.
 */
export class ValueSpec<T> {
	private codec: ValueCodec<T>;
	private id: string;
	defaultValue: T;

	/**
	 * Creates a new value specification.
	 *
	 * @param op - The operator that accesses this value state
	 * @param id - An identifier for this value state
	 * @param codec - The codec used to serialize and deserialize the value
	 * @param defaultValue - The default value to use if the state is not set.
	 * Often using a value like 0 for a count can simplify your handler code.
	 */
  constructor(op: Operator, id: string, codec: ValueCodec<T>, defaultValue: T) {
		this.id = id;
		this.codec = codec;
		this.defaultValue = defaultValue;
  }

	/**
	 * Retrieve the state for the given subject.
	 */
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
