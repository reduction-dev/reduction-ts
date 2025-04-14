import type { ValueCodec } from "./value-codec";
import { create } from "@bufbuild/protobuf";
import * as pb from "../proto/handlerpb/handler_pb";

/**
 * Internal enum to track the status of a value state.
 */
enum ValueStatus {
  Initial,  // Initial state, no mutations to report
  Updated,  // Value has been updated
  Deleted,  // Value has been deleted
}

/**
 * ValueState manages a single named value with state tracking.
 *
 * ValueStates are created using the {@link topology.ValueSpec.stateFor} method.
 *
 * @typeParam T - The type of the value stored in the state
 */
export class ValueState<T> {
  #name: string;
  #value: T;
  #status: ValueStatus = ValueStatus.Initial;
  #codec: ValueCodec<T>;
  #defaultValue: T;

  /**
   * @ignore
   */
  constructor(name: string, codec: ValueCodec<T>, defaultValue: T, entries: pb.StateEntry[]) {
    this.#name = name;
    this.#codec = codec;
    this.#defaultValue = defaultValue;

    if (entries.length === 0) {
      this.#value = defaultValue
    } else {
      this.#value = this.#codec.decode(entries[0].value);
    }
  }

  /**
   * Used to collect mutations to send back to the reduction operator.
   * @internal
   */
  public mutations(): pb.StateMutation[] {
    switch (this.#status) {
      case ValueStatus.Initial:
        return [];
      case ValueStatus.Deleted:
        return [
          create(pb.StateMutationSchema, {
            mutation: {
              case: 'delete',
              value: { key: Buffer.from(this.#name) },
            }
          })
        ];
      case ValueStatus.Updated:
        return [
          create(pb.StateMutationSchema, {
            mutation: {
              case: 'put',
              value: create(pb.PutMutationSchema, {
                key: Buffer.from(this.#name),
                value: this.#value !== undefined
                 ? this.#codec.encode(this.#value)
                 : undefined,
              }),
            }
          })
        ];
      default:
        throw new Error(`Unknown value status: ${this.#status}`);
    }
  }

  /**
   * Gets the name of this state value.
   *
   * @returns The state value name
   */
  public get name(): string {
    return this.#name;
  }

  /**
   * Gets the current state value.
   *
   * @returns The current value
   */
  public get value(): T {
    return this.#value;
  }

  /**
   * Sets a new value.
   *
   * @param value - The new value to store
   */
  public setValue(value: T): void {
    this.#status = ValueStatus.Updated;
    this.#value = value;
  }

  /**
   * Drops the value and resets it to the default value.
   * Dropped state will be deleted from the operator.
   */
  public drop(): void {
    this.#status = ValueStatus.Deleted;
    this.#value = this.#defaultValue;
  }
}
