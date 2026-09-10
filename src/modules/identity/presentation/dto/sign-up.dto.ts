import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class SignUpDto {
  @ApiProperty({ example: 'rakkoonette' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'william@rakkoons.fr' })
  @IsString()
  email!: string;

  @ApiProperty({ example: 'MotDePasseQuiGagne1!' })
  @IsString()
  password!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasAcceptedTerms!: boolean;
}
