import { Inject, Injectable } from '@nestjs/common';
import { JOB_SOURCE_REPOSITORY } from '../repositories/job-source.repository';
import type { IJobSourceRepository } from '../repositories/job-source.repository';
import { ListJobSourceQuery } from '../dto/list-job-source-query.dto.';
import { PaginatedResult } from '../../../../common/dto/pagination-result.dto';
import { JobSource } from '../../domain/job-source.entity';

@Injectable()
export class ListJobSourceEntriesUseCase {
  constructor(
    @Inject(JOB_SOURCE_REPOSITORY)
    private readonly jobSourceRepository: IJobSourceRepository,
  ) {}

  async execute(
    query: ListJobSourceQuery,
  ): Promise<PaginatedResult<JobSource>> {
    const { items, total } = await this.jobSourceRepository.list({
      page: query.page,
      pageSize: query.limit,
    });

    return new PaginatedResult<JobSource>(items, total, {
      page: query.page,
      limit: query.limit,
    });
  }
}
