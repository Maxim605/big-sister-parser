import { IsBoolean, IsInt, IsString, IsUrl } from "class-validator";

export class Db {
  @IsBoolean()
  public debug = false;

  @IsUrl({ require_tld: false })
  public host: string;

  @IsInt()
  public port: number;

  @IsString()
  public username: string;

  @IsString()
  public password: string;

  @IsString()
  public database: string;
}
