import { IsString } from "class-validator";

export class Token {
  @IsString()
  public vkDefault: string;
}
