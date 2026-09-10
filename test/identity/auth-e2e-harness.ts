import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { configureApplication } from '../../src/shared/presentation/configure-application';
import { IdentityToken } from '@identity/identity.tokens';
import { MessageDeliveryFailedError } from '@identity/domain/errors/message-delivery-failed.error';
import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export class CapturingMessageSender implements MessageSender {
  readonly codes = new Map<string, string>();
  readonly signInCodes = new Map<string, string>();
  readonly passwordResetCodes = new Map<string, string>();
  readonly emailChangeCodes = new Map<string, string>();
  readonly emailChangeNotices = new Map<string, string>();
  readonly deletionNotices = new Map<string, Date>();
  deliveryFails = false;

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.capture(this.codes, recipient, code);
  }

  sendSignInCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.capture(this.signInCodes, recipient, code);
  }

  sendEmailChangeCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.capture(this.emailChangeCodes, recipient, code);
  }

  sendEmailChangeNotice(
    previousRecipient: EmailAddress,
    newAddress: EmailAddress,
  ): Promise<void> {
    this.emailChangeNotices.set(
      previousRecipient.toString(),
      newAddress.toString(),
    );
    return Promise.resolve();
  }

  sendAccountDeletionNotice(
    recipient: EmailAddress,
    scheduledAt: Date,
  ): Promise<void> {
    this.deletionNotices.set(recipient.toString(), scheduledAt);
    return Promise.resolve();
  }

  sendPasswordResetCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.capture(this.passwordResetCodes, recipient, code);
  }

  private capture(
    target: Map<string, string>,
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    if (this.deliveryFails) {
      return Promise.reject(new MessageDeliveryFailedError());
    }

    target.set(recipient.toString(), code.reveal());
    return Promise.resolve();
  }
}

export class AuthE2eHarness {
  private nestApplication: NestExpressApplication | null = null;

  readonly messages = new CapturingMessageSender();
  prisma!: PrismaService;
  private throttlerStorage!: ThrottlerStorage;

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
    this.throttlerStorage = application.get(ThrottlerStorage);
  }

  forgetRateLimits(): void {
    if (this.throttlerStorage instanceof ThrottlerStorageService) {
      this.throttlerStorage.storage.clear();
    }
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
    this.messages.signInCodes.clear();
    this.messages.passwordResetCodes.clear();
    this.messages.emailChangeCodes.clear();
    this.messages.emailChangeNotices.clear();
    this.messages.deletionNotices.clear();
    this.messages.deliveryFails = false;
  }

  async stop(): Promise<void> {
    await this.nestApplication?.close();
    this.nestApplication = null;
  }
}

export const AUTH = '/api/v1/auth';
