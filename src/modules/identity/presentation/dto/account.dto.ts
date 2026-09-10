import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeUsernameDto {
  @ApiProperty({ example: 'rakkoonette2' })
  @IsString()
  username!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'MotDePasseQuiGagne1!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NouveauMotDePasse2?' })
  @IsString()
  newPassword!: string;
}

export class AccountResponseDto {
  @ApiProperty({ example: 'rakkoonette' })
  username!: string;

  @ApiProperty({ example: 'william@rakkoons.fr' })
  email!: string;

  @ApiProperty({ example: '2026-01-14T09:12:00.000Z' })
  createdAt!: string;
}

export class AccountSessionDto {
  @ApiProperty({ example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id!: string;

  @ApiProperty({ example: '2026-01-14T09:12:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-20T18:04:00.000Z' })
  lastUsedAt!: string;

  @ApiProperty({ example: true })
  isCurrent!: boolean;
}
