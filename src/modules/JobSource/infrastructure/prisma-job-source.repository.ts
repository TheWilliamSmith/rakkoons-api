import { Injectable } from '@nestjs/common';
import {
  IJobSourceRepository,
  ListCriteria,
  PaginatedEntries,
} from '../application/repositories/job-source.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JobSourceMapper } from './job-source.mapper';

@Injectable()
export class PrismaJobSourceRepository implements IJobSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: ListCriteria): Promise<PaginatedEntries> {
    const [record, total] = await this.prisma.$transaction([
      this.prisma.jobSource.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.jobSource.count(),
    ]);

    return {
      items: record.map(JobSourceMapper.toDomain),
      total,
    };
  }
}
