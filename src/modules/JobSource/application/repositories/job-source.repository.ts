import { JobSource } from '../../domain/job-source.entity';

export interface ListCriteria {
  page: number;
  pageSize: number;
}

export interface PaginatedEntries {
  items: JobSource[];
  total: number;
}

export interface IJobSourceRepository {
  list(criteria: ListCriteria): Promise<PaginatedEntries>;
}

export const JOB_SOURCE_REPOSITORY = Symbol('JOB_SOURCE_REPOSITORY');
