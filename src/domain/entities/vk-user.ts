export class VkUser {
  constructor(
    public readonly id: number,
    public readonly first_name: string,
    public readonly last_name: string,
    public readonly domain?: string,
  ) {}

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  hasDomain(): boolean {
    return this.domain !== undefined && this.domain.length > 0;
  }
}
