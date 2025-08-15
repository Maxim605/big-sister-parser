export class VkGroup {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly screenName: string,
  ) {}

  static fromApi(data: any): VkGroup {
    return new VkGroup(data.id, data.name, data.screen_name);
  }
}
