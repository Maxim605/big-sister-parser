import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { Db } from "./db";
import { VkApi } from "./vk-api";
import { Arango } from "./arango";
import { Redis } from "./redis";
import { VkWallSettings } from "./vk-wall";
import { Token } from "./token";

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
  public envSecret: string;

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
  @Type(() => Arango)
  public arango: Arango;

  @IsDefined()
  @ValidateNested()
  @Type(() => Redis)
  public redis: Redis;

  @IsDefined()
  @ValidateNested()
  @Type(() => VkApi)
  public vkApi: VkApi;

  @IsDefined()
  @ValidateNested()
  @Type(() => Token)
  public token: Token;

  // Конфигурация модуля парсинга стены VK
  @IsDefined()
  @ValidateNested()
  @Type(() => VkWallSettings)
  public vkWall: VkWallSettings = new VkWallSettings();

  @IsOptional()
  @IsBoolean()
  public enableThrift = false;

  @IsOptional()
  public credentials?: any;

  @IsOptional()
  @IsString()
  public apiVersion?: string;
}
