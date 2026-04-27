import { JobSource } from '../domain/job-source.entity';
import { JobSource as PrismaJobSource } from '@generated/prisma/client';

export class JobSourceMapper {
  static toDomain(record: PrismaJobSource): JobSource {
    return JobSource.rehydrate({
      id: record.id,
      name: record.name,
      slug: record.slug,
      baseUrl: record.baseUrl,
      enabled: record.enabled,
      lastRun: record.lastRun,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
