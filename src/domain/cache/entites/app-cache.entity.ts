import { ApiProperty } from "@nestjs/swagger";
import { DateTime } from "luxon";

export class LocalCache {
  // TODO
  @ApiProperty({
    description: "Название модуля данные из которого в кэше",
  })
  @ApiProperty({
    description: "Тип",
  })
  @ApiProperty({
    description: "Данные",
  })
  @ApiProperty({
    description: "Дата-время создания",
    type: "string",
    format: "date-time",
  })
  public createdAt: DateTime;
}
