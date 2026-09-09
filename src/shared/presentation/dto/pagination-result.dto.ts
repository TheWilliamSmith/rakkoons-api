import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResult<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  constructor(
    data: T[],
    total: number,
    query: { page: number; limit: number },
  ) {
    this.data = data;
    this.total = total;
    this.page = query.page;
    this.limit = query.limit;
    this.totalPages = Math.ceil(total / query.limit);
  }
}
