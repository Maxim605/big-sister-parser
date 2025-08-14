import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsArray, IsIn } from "class-validator";
import { Transform, Type } from "class-transformer";

export class VkFriendsGetParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: 508133099,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description: "Порядок сортировки друзей",
    enum: ["name", "hints"],
    required: false,
    example: "name",
  })
  @IsOptional()
  @IsIn(["name", "hints"])
  order?: "name" | "hints";

  @ApiProperty({
    description: "Количество друзей для возврата",
    required: false,
    example: 5,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  count?: number;

  @ApiProperty({
    description: "Смещение от начала списка",
    required: false,
    example: 0,
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
    example: "vk1.a.abcdef123456...",
  })
  @IsString()
  access_token: string;
}
