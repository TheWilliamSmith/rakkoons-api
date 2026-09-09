import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env } from '../../config/env.validation';
import { IdentityToken } from './identity.tokens';
import { EmailMessageSender } from './infrastructure/messaging/email-message-sender';
import { LoggingEmailTransport } from './infrastructure/messaging/logging-email-transport';
import { type EmailTransport } from './infrastructure/messaging/outbound-email';
import { ResendEmailTransport } from './infrastructure/messaging/resend-email-transport';
import { PrismaAccountRepository } from './infrastructure/persistence/prisma-account.repository';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository';
import { PrismaUnitOfWork } from './infrastructure/persistence/prisma-unit-of-work';
import { PrismaVerificationJourneyRepository } from './infrastructure/persistence/prisma-verification-journey.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { RandomSecretGenerator } from './infrastructure/security/random-secret-generator';
import { RandomVerificationCodeGenerator } from './infrastructure/security/random-verification-code-generator';
import { Sha256SecretHasher } from './infrastructure/security/sha256-secret-hasher';
import { UuidIdentifierGenerator } from './infrastructure/security/uuid-identifier-generator';
import { SystemClock } from './infrastructure/time/system-clock';

export const IDENTITY_ADAPTERS: Provider[] = [
  {
    provide: IdentityToken.AccountRepository,
    useClass: PrismaAccountRepository,
  },
  {
    provide: IdentityToken.VerificationJourneyRepository,
    useClass: PrismaVerificationJourneyRepository,
  },
  {
    provide: IdentityToken.SessionRepository,
    useClass: PrismaSessionRepository,
  },
  { provide: IdentityToken.UnitOfWork, useClass: PrismaUnitOfWork },
  { provide: IdentityToken.PasswordHasher, useClass: Argon2PasswordHasher },
  { provide: IdentityToken.SecretHasher, useClass: Sha256SecretHasher },
  {
    provide: IdentityToken.VerificationCodeGenerator,
    useClass: RandomVerificationCodeGenerator,
  },
  {
    provide: IdentityToken.IdentifierGenerator,
    useClass: UuidIdentifierGenerator,
  },
  { provide: IdentityToken.SecretGenerator, useClass: RandomSecretGenerator },
  LoggingEmailTransport,
  {
    provide: IdentityToken.EmailTransport,
    inject: [ConfigService, LoggingEmailTransport],
    useFactory: (
      config: ConfigService<Env, true>,
      logging: LoggingEmailTransport,
    ): EmailTransport => {
      const apiKey = config.get('RESEND_API_KEY', { infer: true });

      if (apiKey === undefined) {
        return logging;
      }

      const from = config.get('MAIL_FROM', { infer: true });

      if (from === undefined) {
        throw new Error(
          'MAIL_FROM is required when RESEND_API_KEY is set, otherwise Resend falls back to its sandbox sender and only delivers to the account owner',
        );
      }

      return new ResendEmailTransport(
        apiKey,
        from,
        config.get('MAIL_REPLY_TO', { infer: true }),
      );
    },
  },
  { provide: IdentityToken.MessageSender, useClass: EmailMessageSender },
  { provide: IdentityToken.Clock, useClass: SystemClock },
];
