import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { Db } from "./db";
import { Grpc } from "./grpc";
import { VkApi } from "./vk-api";

/**
 * Глобальные настройки приложения.
 * TODO Подробное описание - settings.example.yml.
 */

export class Settings {
  @IsDefined()
  @IsBoolean()
  public debug = false;

  @IsDefined()
  @IsString()
  public host: string;

  // префикс URL, по которому будет доступно приложение.
  @IsDefined()
  @IsString()
  public basePath: string;

  @IsDefined()
  @Type(() => Db)
  @ValidateNested()
  public db: Db;

  @IsDefined()
  @ValidateNested()
  @Type(() => Grpc)
  public grpc!: Grpc;

  @IsDefined()
  @ValidateNested()
  @Type(() => VkApi)
  public vkApi!: VkApi;

  @IsOptional()
  public credentials?: any;
}
