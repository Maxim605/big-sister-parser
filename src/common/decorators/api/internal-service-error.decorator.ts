import { ApiInternalServerErrorResponse } from "@nestjs/swagger";
import { InternalErrorResponse } from "src/common/interfaces/internal-error";

export const InternalServiceErrorApiResponse = (
  description = "Ошибка при запросе внешнего сервиса",
): MethodDecorator & ClassDecorator =>
  ApiInternalServerErrorResponse({
    description,
    type: InternalErrorResponse,
  });
