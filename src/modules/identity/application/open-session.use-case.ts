import { CredentialsRejectedError } from '../domain/errors/credentials-rejected.error';
import { Account } from '../domain/account/account';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { IdentifierGenerator } from '../domain/ports/identifier-generator';
import { SecretGenerator } from '../domain/ports/secret-generator';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { EmailAddress } from '../domain/value-objects/email-address';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { Session } from '../domain/session/session';
import { SessionPolicy } from './identity-policy';

export interface OpenSessionInput {
  email: string;
  password: string;
}

export interface OpenSessionOutput {
  sessionIdentifier: string;
  expiresAt: Date;
}

interface OpenSessionDependencies {
  accounts: AccountRepository;
  sessions: SessionRepository;
  passwordHasher: PasswordHasher;
  secretHasher: SecretHasher;
  identifiers: IdentifierGenerator;
  secrets: SecretGenerator;
  clock: Clock;
  policy: SessionPolicy;
}

export class OpenSessionUseCase {
  constructor(private readonly dependencies: OpenSessionDependencies) {}

  async execute(input: OpenSessionInput): Promise<OpenSessionOutput> {
    const email = this.parseEmail(input.email);
    const password = this.parsePassword(input.password);
    const account = email === null ? null : await this.findAccount(email);

    if (account === null || password === null) {
      await this.dependencies.passwordHasher.verifyDecoy();
      throw new CredentialsRejectedError();
    }

    await account.verifyCredentials(password, this.dependencies.passwordHasher);

    if (!account.isActive()) {
      throw new CredentialsRejectedError();
    }

    return this.startSession(account);
  }

  private async findAccount(email: EmailAddress): Promise<Account | null> {
    return this.dependencies.accounts.findByEmail(email);
  }

  private async startSession(account: Account): Promise<OpenSessionOutput> {
    const identifier = this.dependencies.secrets.generate();
    const identifierHash =
      await this.dependencies.secretHasher.hash(identifier);

    const session = Session.open({
      id: this.dependencies.identifiers.generate(),
      accountId: account.id,
      identifierHash,
      slidingLifetime: this.dependencies.policy.slidingLifetime,
      absoluteLifetime: this.dependencies.policy.absoluteLifetime,
      openedAt: this.dependencies.clock.now(),
    });

    await this.dependencies.sessions.add(session);

    return { sessionIdentifier: identifier, expiresAt: session.expiresAt };
  }

  private parseEmail(raw: string): EmailAddress | null {
    try {
      return EmailAddress.create(raw);
    } catch {
      return null;
    }
  }

  private parsePassword(raw: string): PlainPassword | null {
    try {
      return PlainPassword.create(raw);
    } catch {
      return null;
    }
  }
}
