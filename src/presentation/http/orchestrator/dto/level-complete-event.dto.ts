import { ApiProperty } from "@nestjs/swagger";
import settings from "src/settings";

export class LevelCompleteEventDto {
  @ApiProperty({
    description: "ID задачи",
    type: String,
    example: `graph:1234567890:${settings.vkApi.defaultStartId}`,
  })
  job_id: string;

  @ApiProperty({
    description: "Завершённый уровень",
    type: Number,
    example: 2,
  })
  level: number;

  @ApiProperty({
    description: "Размер frontier следующего уровня",
    type: Number,
    example: 150,
  })
  frontier_size: number;

  @ApiProperty({
    description: "Общее количество посещённых узлов",
    type: Number,
    example: 500,
  })
  visited_count: number;
}

