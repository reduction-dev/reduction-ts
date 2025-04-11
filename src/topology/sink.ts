import type { Subject } from "../handler/subject";

export abstract class Sink<T> {
  public abstract collect(subject: Subject, value: T): void
}
