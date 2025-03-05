import type { ValueCodec } from "./value-codec";
import { create } from "@bufbuild/protobuf";
import * as pb from "../proto/handlerpb/handler_pb";

enum ValueStatus {
  Initial,
  Updated,
  Deleted,
}

export class ValueState<T> {
  #name: string;
  #value: T;
  #status: ValueStatus = ValueStatus.Initial;
  #codec: ValueCodec<T>;
  #defaultValue: T;

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
        let data: Uint8Array | undefined;
        if (this.#value !== undefined) {
          data = this.#codec.encode(this.#value);
        }
        return [
          create(pb.StateMutationSchema, {
            mutation: {
              case: 'put',
              value: create(pb.PutMutationSchema, {
                key: Buffer.from(this.#name),
                value: data,
              }),
            }
          })
        ];
      default:
        return [];
    }
  }

  public get name(): string {
    return this.#name;
  }

  public get value(): T {
    return this.#value;
  }

  public setValue(value: T): void {
    this.#status = ValueStatus.Updated;
    this.#value = value;
  }

  public drop(): void {
    this.#status = ValueStatus.Deleted;
    this.#value = this.#defaultValue;
  }
}
