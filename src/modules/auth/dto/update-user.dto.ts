import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsOptional()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phonePrefix?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
