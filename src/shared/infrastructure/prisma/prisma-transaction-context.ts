import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma/client';
import { PrismaService } from './prisma.service';

export type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class PrismaTransactionContext {
  private readonly storage = new AsyncLocalStorage<PrismaTransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  client(): PrismaTransactionClient {
    return this.storage.getStore() ?? this.prisma;
  }

  runWithin<T>(
    client: PrismaTransactionClient,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(client, work);
  }

  transaction<T>(
    work: (client: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((client) => work(client));
  }
}
