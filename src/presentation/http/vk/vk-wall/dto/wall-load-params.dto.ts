import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { Type, Transform } from "class-transformer";
import settings from "src/settings";

export class WallLoadParamsDto {
  @ApiProperty({
    description: "owner_id (отрицательный для групп)",
    example: "508133099",
  })
  @Type(() => Number)
  @IsInt()
  owner_id: number;

  @ApiProperty({
    description: "access_token",
    example: settings.token.vkDefault,
  })
  @IsString()
  access_token: string;

  @ApiPropertyOptional({
    description: "screen name домен сообщества/пользователя",
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: "Смещение" })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === undefined ? 0 : value))
  offset?: number;

  @ApiPropertyOptional({ description: "Количество элементов (по дефолту 200)" })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === undefined ? settings.vkWall.api.pageSizeDefault : value,
  )
  count?: number;
}
