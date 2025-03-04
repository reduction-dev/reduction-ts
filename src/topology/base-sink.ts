import type { Subject } from "../handler/subject";

export abstract class BaseSink<Uint8Array> {
  public collect(subject: Subject, value: Uint8Array): void {
    throw new Error("Method not implemented.");
  }
}
