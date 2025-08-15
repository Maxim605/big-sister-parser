export class VkUser {
  constructor(
    public readonly id: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly domain?: string,
  ) {}

  static fromApi(data: any): VkUser {
    return new VkUser(data.id, data.first_name, data.last_name, data.domain);
  }
}
