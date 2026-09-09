import { Provider } from '@nestjs/common';
import { IdentityToken } from './identity.tokens';
import { LoggingMessageSender } from './infrastructure/messaging/logging-message-sender';
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
  { provide: IdentityToken.MessageSender, useClass: LoggingMessageSender },
  { provide: IdentityToken.Clock, useClass: SystemClock },
];
