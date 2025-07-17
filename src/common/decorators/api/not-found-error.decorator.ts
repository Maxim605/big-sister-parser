import { ApiNotFoundResponse } from "@nestjs/swagger";
import { NotFoundErrorResponse } from "src/common/interfaces/not-fount-error";

export const NotFoundErrorApiResponse = (
  description = "Не найдено",
): MethodDecorator & ClassDecorator =>
  ApiNotFoundResponse({
    description,
    type: NotFoundErrorResponse,
  });
