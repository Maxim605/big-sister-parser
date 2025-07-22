import { IsInt, IsOptional, IsNumber } from "class-validator";

export class VkSubscriptionEntity {
  @IsInt()
  _from: number;

  @IsInt()
  _to: number;

  @IsOptional()
  @IsNumber()
  similarity?: number;
}
