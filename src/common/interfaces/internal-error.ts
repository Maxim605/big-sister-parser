import { ApiProperty } from "@nestjs/swagger";

/**
 * Ошибки внешних сервисов.
 * Ошибки которые могут прилететь при запросах внешних сервисов ЭУ
 */
export class InternalErrorResponse {
  @ApiProperty({
    description: "HTTP-код ошибки, например 500",
    example: 500,
  })
  public readonly statusCode: number;

  @ApiProperty({
    description: "Название ошибки - Internal Server Error",
    example: "Internal Server Error",
  })
  public readonly error: string;

  @ApiProperty({
    description: "Сообщение клиенту API",
    example: "Ошибка при работе с внешним сервисом",
  })
  public readonly message: string;
}
