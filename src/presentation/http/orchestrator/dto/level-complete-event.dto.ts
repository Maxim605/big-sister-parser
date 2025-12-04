import { ApiProperty } from "@nestjs/swagger";

export class LevelCompleteEventDto {
  @ApiProperty({
    description: "ID задачи",
    type: String,
    example: "graph:1234567890:508133099",
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

