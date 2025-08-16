export class GroupId {
  private constructor(public readonly value: number) {}
  static create(value: number): GroupId {
    if (!Number.isInteger(value) || value <= 0)
      throw new Error("Invalid GroupId");
    return new GroupId(value);
  }
}
