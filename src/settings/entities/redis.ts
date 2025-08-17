import { IsDefined, IsString } from "class-validator";

export class Redis {
  @IsDefined()
  @IsString()
  public url: string;
}
