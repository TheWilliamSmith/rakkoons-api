import { Controller } from '@nestjs/common';
import { Get, Query } from '@nestjs/common';
import { ListJobSourceEntriesUseCase } from '../application/use-cases/list-job-source-entries.use-case';
import { PaginatedResult } from '../../../common/dto/pagination-result.dto';
import { ListJobSourceQuery } from '../application/dto/list-job-source-query.dto.';
import { JobSourceResponse } from './responses/job-source.response';

@Controller('job-sources')
export class JobSourceController {
  constructor(private readonly listUC: ListJobSourceEntriesUseCase) {}

  @Get()
  async list(
    @Query() query: ListJobSourceQuery,
  ): Promise<PaginatedResult<JobSourceResponse>> {
    const result = await this.listUC.execute(query);
    return new PaginatedResult(
      result.data.map(JobSourceResponse.fromDomain),
      result.total,
      { page: query.page, limit: query.limit },
    );
  }
}
