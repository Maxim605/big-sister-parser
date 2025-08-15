export class UrlVO {
  private constructor(public readonly value: string) {}
  static create(value: string): UrlVO {
    try {
      new URL(value);
      return new UrlVO(value);
    } catch {
      throw new Error('Invalid URL');
    }
  }
}
