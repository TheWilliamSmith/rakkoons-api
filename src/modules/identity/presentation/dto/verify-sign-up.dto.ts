import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifySignUpDto {
  @ApiProperty({ example: '429861' })
  @IsString()
  code!: string;
}
