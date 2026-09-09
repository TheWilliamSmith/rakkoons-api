import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Global()
@Module({
  providers: [PrismaService, PrismaTransactionContext],
  exports: [PrismaService, PrismaTransactionContext],
})
export class PrismaModule {}
