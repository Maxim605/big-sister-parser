import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserFriendsResultDto {
  @ApiProperty({ description: "ID пользователя" })
  user_id: number;

  @ApiProperty({ description: "Успешность операции" })
  success: boolean;

  @ApiPropertyOptional({ description: "Текст ошибки" })
  error?: string;

  @ApiPropertyOptional({ description: "Данные ответа" })
  data?: any;
}

