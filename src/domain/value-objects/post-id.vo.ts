export class PostId {
  private constructor(public readonly value: string) {}
  static create(value: string): PostId {
    if (!value) throw new Error("Invalid PostId");
    return new PostId(value);
  }
}
