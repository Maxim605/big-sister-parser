export class TimestampVO {
  private constructor(public readonly value: number) {}
  static now(): TimestampVO {
    return new TimestampVO(Date.now());
  }
  static create(value: number): TimestampVO {
    if (!Number.isFinite(value)) throw new Error("Invalid Timestamp");
    return new TimestampVO(value);
  }
}
