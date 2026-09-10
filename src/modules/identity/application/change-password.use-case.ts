import { CurrentPasswordRejectedError } from '../domain/errors/current-password-rejected.error';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { dispatchNotice } from './notice-dispatch';

export interface ChangePasswordInput {
  accountId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordDependencies {
  accounts: AccountRepository;
  sessions: SessionRepository;
  unitOfWork: UnitOfWork;
  passwordHasher: PasswordHasher;
  messages: MessageSender;
  clock: Clock;
}

export class ChangePasswordUseCase {
  constructor(private readonly dependencies: ChangePasswordDependencies) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const current = await this.parseCurrent(input.currentPassword);
    const next = PlainPassword.create(input.newPassword);
    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    const changedAt = this.dependencies.clock.now();

    await account.replacePassword(
      { current, next },
      this.dependencies.passwordHasher,
      changedAt,
    );

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.accounts.save(account);
      await this.dependencies.sessions.revokeAllForAccountExcept(
        account.id,
        input.currentSessionId,
        changedAt,
      );
    });

    dispatchNotice(
      this.dependencies.messages.sendPasswordChanged(account.email),
    );
  }

  private async parseCurrent(raw: string): Promise<PlainPassword> {
    try {
      return PlainPassword.create(raw);
    } catch {
      await this.dependencies.passwordHasher.verifyDecoy();
      throw new CurrentPasswordRejectedError();
    }
  }
}
