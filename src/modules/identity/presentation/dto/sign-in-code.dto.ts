import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestSignInCodeDto {
  @ApiProperty({ example: 'william@rakkoons.fr' })
  @IsString()
  email!: string;
}

export class VerifySignInCodeDto {
  @ApiProperty({ example: '429861' })
  @IsString()
  code!: string;
}
