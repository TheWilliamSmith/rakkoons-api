import { CredentialsRejectedError } from '../domain/errors/credentials-rejected.error';
import { Account } from '../domain/account/account';
import { AccountRepository } from '../domain/ports/account-repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { EmailAddress } from '../domain/value-objects/email-address';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { OpenedSession, SessionOpener } from './session-opener';

export interface OpenSessionInput {
  email: string;
  password: string;
}

export type OpenSessionOutput = OpenedSession;

interface OpenSessionDependencies {
  accounts: AccountRepository;
  passwordHasher: PasswordHasher;
  sessionOpener: SessionOpener;
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

    return this.dependencies.sessionOpener.openFor(account);
  }

  private async findAccount(email: EmailAddress): Promise<Account | null> {
    return this.dependencies.accounts.findByEmail(email);
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
