import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigModule } from '../../src/config/env.config';
import { PrismaModule } from '../../src/shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { PrismaTransactionContext } from '../../src/shared/infrastructure/prisma/prisma-transaction-context';
import { PrismaAccountRepository } from '@identity/infrastructure/persistence/prisma-account.repository';
import { PrismaSessionRepository } from '@identity/infrastructure/persistence/prisma-session.repository';
import { PrismaUnitOfWork } from '@identity/infrastructure/persistence/prisma-unit-of-work';
import { PrismaVerificationJourneyRepository } from '@identity/infrastructure/persistence/prisma-verification-journey.repository';

export class PrismaIdentityHarness {
  private application: INestApplication | null = null;

  prisma!: PrismaService;
  accounts!: PrismaAccountRepository;
  journeys!: PrismaVerificationJourneyRepository;
  sessions!: PrismaSessionRepository;
  unitOfWork!: PrismaUnitOfWork;

  async start(): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule],
    }).compile();

    this.application = moduleRef.createNestApplication();
    await this.application.init();

    const context = this.application.get(PrismaTransactionContext);

    this.prisma = this.application.get(PrismaService);
    this.accounts = new PrismaAccountRepository(context);
    this.journeys = new PrismaVerificationJourneyRepository(context);
    this.sessions = new PrismaSessionRepository(context);
    this.unitOfWork = new PrismaUnitOfWork(context);
  }

  async reset(): Promise<void> {
    await this.prisma.session.deleteMany();
    await this.prisma.verificationJourney.deleteMany();
    await this.prisma.account.deleteMany();
  }

  async stop(): Promise<void> {
    await this.application?.close();
    this.application = null;
  }
}
