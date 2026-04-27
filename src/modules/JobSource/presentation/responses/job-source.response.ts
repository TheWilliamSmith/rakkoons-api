import { ApiProperty } from '@nestjs/swagger';
import { JobSource } from '../../domain/job-source.entity';

export class JobSourceResponse {
  id!: string;
  name!: string;
  slug!: string;
  baseUrl!: string;
  enabled!: boolean;
  lastRun!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(entry: JobSource): JobSourceResponse {
    return {
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      baseUrl: entry.baseUrl,
      enabled: entry.enabled,
      lastRun: entry.lastRun,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
