import { ApiProperty } from "@nestjs/swagger";
import { LoadFriendsGraphStatsDto } from "./load-friends-graph-stats.dto";

export class LoadFriendsGraphResponseDto {
  @ApiProperty({
    description: "ID задачи",
    type: String,
    example: "graph:1234567890:508133099",
  })
  job_id: string;

  @ApiProperty({
    description: "Количество посещённых узлов",
    type: Number,
    example: 1000,
  })
  visited_count: number;

  @ApiProperty({
    description: "Количество обработанных уровней",
    type: Number,
    example: 3,
  })
  levels_processed: number;

  @ApiProperty({
    description: "Статистика выполнения",
    type: LoadFriendsGraphStatsDto,
  })
  stats: LoadFriendsGraphStatsDto;

  @ApiProperty({
    description: "Список ID посещённых пользователей",
    type: [Number],
    example: [508133099, 123456789, 987654321],
  })
  visited_ids: number[];
}

