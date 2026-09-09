import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UsernameAvailabilityQueryDto {
  @ApiProperty({ example: 'rakkoonette' })
  @IsString()
  username!: string;
}

export class UsernameAvailabilityResponseDto {
  @ApiProperty({ example: true })
  isAvailable!: boolean;
}
