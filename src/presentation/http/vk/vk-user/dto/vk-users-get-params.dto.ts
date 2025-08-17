import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsBoolean,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class VkUsersGetParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: 508133099,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description: "Доп. поля",
    required: false,
    example: ["screen_name"],
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
    description: "Падеж",
    enum: ["nom", "gen", "dat", "acc", "ins", "abl"],
    required: false,
  })
  @IsOptional()
  @IsIn(["nom", "gen", "dat", "acc", "ins", "abl"])
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";

  @ApiProperty({ description: "access_token", example: "vk1.a.abcdef" })
  @IsString()
  access_token: string;
}

export class VkUsersGetSubscriptionsParamsDto {
  @ApiProperty({
    description: "ID пользователя VK",
    example: 508133099,
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({ description: "access_token", example: "vk1.a.abcdef" })
  @IsString()
  access_token: string;

  @ApiProperty({
    description: "Расширенный ответ",
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  extended?: boolean;

  @ApiPropertyOptional({
    description: "Смещение",
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    description: "Количество",
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  count?: number;

  @ApiProperty({
    description: "Доп. поля для групп",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",") : value,
  )
  fields?: string[];
}
