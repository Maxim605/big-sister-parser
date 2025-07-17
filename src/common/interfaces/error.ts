import { ApiProperty } from "@nestjs/swagger";

/**
 * Внутренние ошибки API
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: "HTTP-код ошибки, например 400 или 500",
    example: 403,
  })
  public readonly statusCode: number;

  @ApiProperty({
    description:
      "Название ошибки - Bad Request, Internal Server Error, Not Found",
    example: "Forbidden",
  })
  public readonly error: string;
}
