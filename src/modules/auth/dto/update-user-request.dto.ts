import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class UpdateUserRequestDto {
  @IsString()
  userId!: string;

  @IsString()
  enterpriseId!: string;

  @ValidateNested()
  @Type(() => UpdateUserDto)
  data!: UpdateUserDto;
}
