import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/infrastructure/prisma/prisma-transaction-context';
import { UnitOfWork } from '../../domain/ports/unit-of-work';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly context: PrismaTransactionContext) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.context.transaction((client) =>
      this.context.runWithin(client, work),
    );
  }
}
