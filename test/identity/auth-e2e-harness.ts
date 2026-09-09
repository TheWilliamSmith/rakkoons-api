import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { IdentityToken } from '@identity/identity.tokens';
import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export class CapturingMessageSender implements MessageSender {
  readonly codes = new Map<string, string>();
  readonly existingAccountNotices: string[] = [];

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.codes.set(recipient.toString(), code.reveal());
    return Promise.resolve();
  }

  sendRegistrationAttemptOnExistingAccount(
    recipient: EmailAddress,
  ): Promise<void> {
    this.existingAccountNotices.push(recipient.toString());
    return Promise.resolve();
  }
}

export class AuthE2eHarness {
  private nestApplication: INestApplication<App> | null = null;

  readonly messages = new CapturingMessageSender();
  prisma!: PrismaService;

  async start(): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IdentityToken.MessageSender)
      .useValue(this.messages)
      .compile();

    const application: INestApplication<App> =
      moduleRef.createNestApplication();

    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    application.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    application.setGlobalPrefix('api');

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
    this.messages.existingAccountNotices.length = 0;
  }

  async stop(): Promise<void> {
    await this.nestApplication?.close();
    this.nestApplication = null;
  }
}

export const AUTH = '/api/v1/auth';
