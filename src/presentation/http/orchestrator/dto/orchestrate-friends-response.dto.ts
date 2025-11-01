import { ApiProperty } from "@nestjs/swagger";
import { UserFriendsResultDto } from "./user-friends-result.dto";

export class OrchestrateFriendsResponseDto {
  @ApiProperty({ description: "Количество успешно обработанных" })
  processed: number;

  @ApiProperty({ description: "Количество ошибок" })
  failed: number;

  @ApiProperty({
    description: "Результаты по каждому пользователю",
    type: [UserFriendsResultDto],
  })
  results: UserFriendsResultDto[];
}
