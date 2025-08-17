export class VkGroup {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly screen_name: string,
    public readonly description?: string,
    public readonly verified?: boolean,
    public readonly city_id?: number,
    public readonly country_id?: number,
    public readonly photo?: string,
    public readonly prominence?: number,
  ) {}

  isVerified(): boolean {
    return this.verified === true;
  }

  hasDescription(): boolean {
    return this.description !== undefined && this.description.length > 0;
  }

  getDisplayName(): string {
    return this.name;
  }
}
