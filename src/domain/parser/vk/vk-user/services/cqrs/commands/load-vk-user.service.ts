export class LoadVkUserService {
  /**
   * @deprecated Domain layer must not call infrastructure (VK API, DB). Use an application use-case instead.
   */
  public async execute(): Promise<never> {
    throw new Error(
      "LoadVkUserService is deprecated. Use an application-layer use case with repositories to load and persist VK user.",
    );
  }
}
