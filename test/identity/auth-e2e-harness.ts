import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { configureApplication } from '../../src/shared/presentation/configure-application';
import { IdentityToken } from '@identity/identity.tokens';
import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export class CapturingMessageSender implements MessageSender {
  readonly codes = new Map<string, string>();

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.codes.set(recipient.toString(), code.reveal());
    return Promise.resolve();
  }
}

export class AuthE2eHarness {
  private nestApplication: NestExpressApplication | null = null;

  readonly messages = new CapturingMessageSender();
  prisma!: PrismaService;

  async start(): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IdentityToken.MessageSender)
      .useValue(this.messages)
      .compile();

    const application =
      moduleRef.createNestApplication<NestExpressApplication>();

    configureApplication(application);

    await application.init();

    this.nestApplication = application;
    this.prisma = application.get(PrismaService);
  }

  server(): App {
    if (this.nestApplication === null) {
      throw new Error('Harness not started');
    }

    return this.nestApplication.getHttpServer();
  }

  async reset(): Promise<void> {
    await this.prisma.session.deleteMany();
    await this.prisma.verificationJourney.deleteMany();
    await this.prisma.account.deleteMany();
    this.messages.codes.clear();
  }

  async stop(): Promise<void> {
    await this.nestApplication?.close();
    this.nestApplication = null;
  }
}

export const AUTH = '/api/v1/auth';
