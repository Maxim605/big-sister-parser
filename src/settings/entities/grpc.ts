import { IsDefined, IsString, IsOptional } from "class-validator";

export class Grpc {
  @IsDefined()
  @IsString()
  public url: string;

  @IsDefined()
  @IsString()
  public package: string;

  @IsDefined()
  @IsString()
  public protoPath: string;

  @IsOptional()
  public credentials?: any;
}