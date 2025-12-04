import { ApiProperty } from "@nestjs/swagger";

export class LoadFriendsGraphStatsDto {
  @ApiProperty({
    description: "Количество API вызовов",
    type: Number,
    example: 150,
  })
  api_calls: number;

  @ApiProperty({
    description: "Количество ошибок API",
    type: Number,
    example: 5,
  })
  api_errors: number;

  @ApiProperty({
    description: "Количество повторных попыток API",
    type: Number,
    example: 10,
  })
  api_retries: number;

  @ApiProperty({
    description: "Количество чтений из БД",
    type: Number,
    example: 50,
  })
  db_reads: number;

  @ApiProperty({
    description: "Количество записей в БД",
    type: Number,
    example: 200,
  })
  db_writes: number;
}

