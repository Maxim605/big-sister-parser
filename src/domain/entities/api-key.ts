export type ApiKeyStatus = "active" | "invalid" | "paused";

export class ApiKey {
  constructor(
    public readonly id: string,
    public readonly network: string,
    public readonly tokenEncrypted: string,
    public status: ApiKeyStatus = "active",
    public pausedUntil?: number,
  ) {}
}
