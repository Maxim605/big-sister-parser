export class UserId {
  private constructor(public readonly value: number) {}
  static create(value: number): UserId {
    if (!Number.isInteger(value) || value <= 0)
      throw new Error("Invalid UserId");
    return new UserId(value);
  }
}
