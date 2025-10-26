import { IsOptional, IsString } from 'class-validator';

export class ProfileRequestDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  enterpriseId?: string;
}
