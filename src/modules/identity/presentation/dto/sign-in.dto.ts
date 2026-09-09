import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'william@rakkoons.fr' })
  @IsString()
  email!: string;

  @ApiProperty({ example: 'MotDePasseQuiGagne1' })
  @IsString()
  password!: string;
}
