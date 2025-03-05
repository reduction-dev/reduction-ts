import type { Operator } from "./operator";
import type { Subject } from "../handler/subject";
import type { MapCodec } from "../state";
import { MapState } from "../state/map-state";

export class MapSpec<K, V> {
  private codec: MapCodec<K, V>;
  private id: string;

  constructor(op: Operator, id: string, codec: MapCodec<K, V>) {
    this.id = id;
    this.codec = codec;
  }

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
