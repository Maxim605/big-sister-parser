import { ApiProperty } from "@nestjs/swagger";

/**
 * Ошибки внешних сервисов.
 * Ошибки которые могут прилететь при запросе несуществующих данных
 */
export class NotFoundErrorResponse {
  @ApiProperty({
    description: "HTTP-код ошибки, например 404",
    example: 404,
  })
  public readonly statusCode: number;

  @ApiProperty({
    description: "Название ошибки - Not Found Error",
    example: "Not Found Error",
  })
  public readonly error: string;

  @ApiProperty({
    description: "Сообщение клиенту API",
    example: "Не найдено",
  })
  public readonly message: string;
}
