import { IsDefined, IsString, IsOptional } from "class-validator";

export class Grpc {
  @IsDefined()
  @IsString()
  public url!: string;

  @IsDefined()
  @IsString()
  public database!: string;

  @IsDefined()
  @IsString()
  public username!: string;

  @IsDefined()
  @IsString()
  public password!: string;

  @IsDefined()
  @IsString()
  public package!: string;

  @IsDefined()
  @IsString()
  public protoPath!: string;

  @IsOptional()
  public credentials?: any;
}
