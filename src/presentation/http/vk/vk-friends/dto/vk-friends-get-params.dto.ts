import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsArray, IsIn } from "class-validator";
import { Transform, Type } from "class-transformer";
import settings from "src/settings";

export class VkFriendsGetParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: settings.vkApi.defaultStartId,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description: "Порядок сортировки друзей",
    enum: ["name", "hints"],
    required: false,
  })
  @IsOptional()
  @IsIn(["name", "hints"])
  order?: "name" | "hints";

  @ApiPropertyOptional({
    description: "Количество друзей для возврата",
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  count?: number;

  @ApiPropertyOptional({
    description: "Смещение от начала списка",
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @ApiProperty({
    description: "Дополнительные поля для возврата",
    required: false,
    example: ["city", "bdate", "sex"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",") : value,
  )
  fields?: string[];

  @ApiProperty({
    description: "Падеж для склонения имени",
    enum: ["nom", "gen", "dat", "acc", "ins", "abl"],
    required: false,
    example: "nom",
  })
  @IsOptional()
  @IsIn(["nom", "gen", "dat", "acc", "ins", "abl"])
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";

  @ApiProperty({
    description: "access_token",
    example: settings.token.vkDefault,
  })
  @IsString()
  access_token: string;

  @ApiPropertyOptional({
    description:
      "Перезаписать данные даже если они уже сохранены (по умолчанию false)",
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true || value === 1 || value === "1")
      return true;
    if (value === "false" || value === false || value === 0 || value === "0")
      return false;
    return undefined;
  })
  rewrite?: boolean;
}
