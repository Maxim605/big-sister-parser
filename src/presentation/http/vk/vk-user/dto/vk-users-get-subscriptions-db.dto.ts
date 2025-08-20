import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class VkUsersGetSubscriptionsDbParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: 508133099,
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
