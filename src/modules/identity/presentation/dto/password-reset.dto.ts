import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'william@rakkoons.fr' })
  @IsString()
  email!: string;
}

export class VerifyPasswordResetDto {
  @ApiProperty({ example: '429861' })
  @IsString()
  code!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'MotDePasseQuiGagne1!' })
  @IsString()
  password!: string;
}
