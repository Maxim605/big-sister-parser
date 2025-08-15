export class VkPost {
  constructor(
    public readonly id: string,
    public readonly ownerId: number,
    public readonly fromId: number,
    public readonly text: string,
    public readonly date: number,
  ) {}
}
