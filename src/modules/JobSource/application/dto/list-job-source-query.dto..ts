import { IsDate, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListJobSourceQuery extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter job sources updated from this date (inclusive)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: 'Filter job sources updated until this date (inclusive)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDate()
  to?: Date;
}
