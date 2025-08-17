export class VkFriend {
  constructor(
    public readonly id: number,
    public readonly first_name: string,
    public readonly last_name: string,
    public readonly sex: number,
    public readonly bdate: string,
    public readonly city_id: number,
    public readonly domain: string,
    public readonly owner_user_id: number,
    public readonly photo?: string,
    public readonly country_id?: number,
    public readonly school_id?: number,
    public readonly univercity_id?: number,
    public readonly last_seen?: string,
    public readonly deactivated?: number,
    public readonly is_closen?: number,
    public readonly prominence?: number,
  ) {}

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  isActive(): boolean {
    return !this.deactivated;
  }

  isOnline(): boolean {
    return this.last_seen !== undefined;
  }
}
