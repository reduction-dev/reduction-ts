import type { Operator } from "./operator";
import type { Subject } from "../handler/subject";
import type { MapCodec } from "../state";
import { MapState } from "../state/map-state";

/**
 * A specification for a map state.
 *
 * @typeParam K - The type of the keys in the map.
 * @typeParam V - The type of the values in the map.
 */
export class MapSpec<K, V> {
  private codec: MapCodec<K, V>;
  private id: string;

  /**
   * Create a new MapSpec.
   *
   * @param op - The operator that will read and write the state.
   * @param id - An ID for the state.
   * @param codec - The codec to use for serializing and deserializing the state.
   * @typeParam K - The type of the keys in the map.
   * @typeParam V - The type of the values in the map.
   */
  constructor(op: Operator, id: string, codec: MapCodec<K, V>) {
    this.id = id;
    this.codec = codec;
  }

  /**
   * Retrieve the state for the given subject.
   */
  public stateFor(subject: Subject): MapState<K, V> {
    const cachedState = subject.context.getState(this.id);
    if (cachedState !== undefined) {
      return cachedState as MapState<K, V>;
    }

    const state = new MapState<K, V>(
      this.id,
      this.codec,
      subject.context.getStateEntries(this.id)
    );
    subject.context.putState(this.id, state);
    subject.context.registerStateUse(this.id, state);
    return state;
  }
}
