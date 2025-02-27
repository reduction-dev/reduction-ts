import type { Operator } from "./operator";

export class Source {
  private operators: Operator[] = [];

  public connect(operator: Operator): void {
    this.operators.push(operator);
  }
}
