import { IsInt, IsOptional, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class VkWallApiConfig {
  @IsInt()
  @Min(1)
  public pageSizeDefault = 200;

  @IsInt()
  @Min(1)
  public maxPageSize = 200;
}

export class VkWallByIdConfig {
  @IsInt()
  @Min(1)
  public apiBatchSizeDefault = 100;
}

export class VkWallDbConfig {
  @IsInt()
  @Min(1)
  public batchSizeDefault = 500;

  @IsInt()
  @Min(1)
  public maxBatchSize = 2000;
}

export class VkWallWorkerPoolConfig {
  @IsInt()
  @Min(1)
  public defaultConcurrency = 4;

  @IsInt()
  @Min(1)
  public maxConcurrency = 32;
}

export class VkWallQueueConfig {
  @IsInt()
  @Min(0)
  public attempts = 3;

  @IsInt()
  @Min(0)
  public backoffMs = 1000;

  @IsInt()
  @Min(1)
  public concurrency = 4;
}

export class VkWallSettings {
  @ValidateNested()
  @Type(() => VkWallApiConfig)
  public api = new VkWallApiConfig();

  @ValidateNested()
  @Type(() => VkWallByIdConfig)
  public byId = new VkWallByIdConfig();

  @ValidateNested()
  @Type(() => VkWallDbConfig)
  public db = new VkWallDbConfig();

  @ValidateNested()
  @Type(() => VkWallWorkerPoolConfig)
  public workerPool = new VkWallWorkerPoolConfig();

  @ValidateNested()
  @Type(() => VkWallQueueConfig)
  public queue = new VkWallQueueConfig();
}
