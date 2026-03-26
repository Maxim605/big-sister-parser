import { IsInt, IsOptional, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class OrchestratorBatchConfig {
  @IsInt()
  @Min(1)
  public defaultBatchSize = 10;

  @IsInt()
  @Min(1)
  public maxBatchSize = 100;
}

export class OrchestratorConcurrencyConfig {
  @IsInt()
  @Min(1)
  public defaultConcurrency = 4;

  @IsInt()
  @Min(1)
  public maxConcurrency = 32;
}

export class OrchestratorFriendsConfig {
  @ValidateNested()
  @Type(() => OrchestratorBatchConfig)
  public batch = new OrchestratorBatchConfig();

  @ValidateNested()
  @Type(() => OrchestratorConcurrencyConfig)
  public concurrency = new OrchestratorConcurrencyConfig();
}

export class OrchestratorSettings {
  @ValidateNested()
  @Type(() => OrchestratorFriendsConfig)
  public friends = new OrchestratorFriendsConfig();
}
