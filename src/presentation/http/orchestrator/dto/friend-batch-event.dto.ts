import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import settings from "src/settings";

export class FriendBatchEventDto {
  @ApiProperty({
    description: "ID задачи",
    type: String,
    example: `graph:1234567890:${settings.vkApi.defaultStartId}`,
  })
  job_id: string;

  @ApiProperty({
    description: "Уровень обхода",
    type: Number,
    example: 2,
  })
  level: number;

  @ApiProperty({
    description: "ID исходного пользователя",
    type: Number,
    example: settings.vkApi.defaultStartId,
  })
  source_id: number;

  @ApiProperty({
    description: "Индекс батча",
    type: Number,
    example: 0,
  })
  batch_index: number;

  @ApiProperty({
    description: "Список ID друзей",
    type: [Number],
    example: [123456789, 987654321],
  })
  friends: number[];

  @ApiProperty({
    description: "Статус обработки",
    enum: ["ok", "partial", "error"],
    example: "ok",
  })
  status: "ok" | "partial" | "error";

  @ApiPropertyOptional({
    description: "Код ошибки (если есть)",
    type: String,
    example: "6",
  })
  error_code?: string;
}
