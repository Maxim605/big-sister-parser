import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional } from "class-validator";
import { Type, Transform } from "class-transformer";
import settings from "src/settings";

export class WallGetParamsDto {
  @ApiProperty({
    description: "owner_id (отрицательный для групп)",
    example: 508133099,
  })
  @Type(() => Number)
  @IsInt()
  owner_id?: number;

  @ApiPropertyOptional({ description: "Смещение" })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === undefined ? 0 : value))
  offset?: number;

  @ApiPropertyOptional({
    description: "Количество элементов (по дефолту 200)",
    example: 10,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === undefined ? settings.vkWall.api.pageSizeDefault : value,
  )
  count?: number;
}
