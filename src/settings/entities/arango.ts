import { IsDefined, IsString } from "class-validator";

export class Arango {
  @IsDefined()
  @IsString()
  public url: string;

  @IsDefined()
  @IsString()
  public database: string;

  @IsDefined()
  @IsString()
  public username: string;

  @IsDefined()
  @IsString()
  public password: string;
}
