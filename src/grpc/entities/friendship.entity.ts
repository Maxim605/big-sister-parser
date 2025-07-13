import { IsOptional, IsNumber } from "class-validator";

export class FriendshipEdge {
  @IsNumber()
  _from: number;

  @IsNumber()
  _to: number;

  @IsOptional()
  @IsNumber()
  similarity?: number;

  [key: string]: any;
}
