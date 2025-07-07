import { IsDefined, IsString, IsOptional } from "class-validator";

export class Grpc {
  @IsDefined()
  @IsString()
  public package!: string;

  @IsDefined()
  @IsString()
  public protoPath!: string;

  @IsDefined()
  @IsString()
  public url!: string;

  @IsOptional()
  public credentials?: any;
}