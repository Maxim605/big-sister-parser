import { ApiProperty } from "@nestjs/swagger";
import { LoadFriendsGraphStatsDto } from "./load-friends-graph-stats.dto";
import settings from "src/settings";

export class LoadFriendsGraphResponseDto {
  @ApiProperty({
    description: "ID задачи",
    type: String,
    example: `graph:1234567890:${settings.vkApi.defaultStartId}`,
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
    example: [settings.vkApi.defaultStartId, 123456789, 987654321],
  })
  visited_ids: number[];
}
