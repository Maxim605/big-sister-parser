import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import settings from "src/settings";

export class VkUsersGetSubscriptionsDbParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: settings.vkApi.defaultStartId,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiPropertyOptional({ description: "Количество" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  count?: number;

  @ApiPropertyOptional({ description: "Смещение" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
