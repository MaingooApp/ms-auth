import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;

  @IsOptional()
  @IsString()
  phonePrefix?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  emailFluvia?: string;
}
