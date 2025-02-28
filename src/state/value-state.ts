import type { ValueCodec } from "./value-codec";
import * as pb from "@rxn/proto/handlerpb/handler_pb";
import { create } from "@bufbuild/protobuf";

enum ValueStatus {
  Initial,
  Updated,
  Deleted,
}

export class ValueState<T> {
  private name: string;
  private value: T;
  private status: ValueStatus = ValueStatus.Initial;
  private codec: ValueCodec<T>;
  private defaultValue: T;

  constructor(name: string, codec: ValueCodec<T>, defaultValue: T, entries: pb.StateEntry[]) {
    this.name = name;
    this.codec = codec;
    this.defaultValue = defaultValue;

    if (entries.length === 0) {
      this.value = defaultValue;
    } else {
      this.value = this.codec.decode(entries[0].value);
    }
  }

  public mutations(): pb.StateMutation[] {
    if (this.status === ValueStatus.Initial) {
      return [];
    }

    if (this.status === ValueStatus.Deleted) {
      const mutation = create(pb.StateMutationSchema, {
        mutation: {
          case: 'delete',
          value: { key: Buffer.from(this.name) },
        }
      });

      return [mutation];
    }

    const data = this.codec.encode(this.value);
    const mutation = create(pb.StateMutationSchema, {
      mutation: {
        case: 'put',
        value: create(pb.PutMutationSchema, {
          key: Buffer.from(this.name),
          value: data,
        }),
      }
    });

    return [mutation];
  }

  public getName(): string {
    return this.name;
  }

  public getValue(): T {
    return this.value;
  }

  public setValue(value: T): void {
    this.status = ValueStatus.Updated;
    this.value = value;
  }

  public drop(): void {
    this.status = ValueStatus.Deleted;
    this.value = this.defaultValue;
  }
}
