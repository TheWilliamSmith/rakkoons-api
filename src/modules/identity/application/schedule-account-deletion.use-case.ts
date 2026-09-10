import { Account } from '../domain/account/account';
import { CurrentPasswordRejectedError } from '../domain/errors/current-password-rejected.error';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { UnitOfWork } from '../domain/ports/unit-of-work';
import { PlainPassword } from '../domain/value-objects/plain-password';
import { AccountDeletionPolicy } from './identity-policy';

export interface ScheduleAccountDeletionInput {
  accountId: string;
  currentPassword: string;
}

interface ScheduleAccountDeletionDependencies {
  accounts: AccountRepository;
  sessions: SessionRepository;
  unitOfWork: UnitOfWork;
  passwordHasher: PasswordHasher;
  messages: MessageSender;
  clock: Clock;
  policy: AccountDeletionPolicy;
}

export class ScheduleAccountDeletionUseCase {
  constructor(
    private readonly dependencies: ScheduleAccountDeletionDependencies,
  ) {}

  async execute(input: ScheduleAccountDeletionInput): Promise<void> {
    const account = await this.loadAccount(input.accountId);

    await this.verifyCurrentPassword(account, input.currentPassword);

    const requestedAt = this.dependencies.clock.now();
    const scheduledAt = new Date(
      requestedAt.getTime() + this.dependencies.policy.gracePeriod,
    );

    account.scheduleDeletion(scheduledAt, requestedAt);

    await this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.accounts.save(account);
      await this.dependencies.sessions.revokeAllForAccount(
        account.id,
        requestedAt,
      );
    });

    await this.dependencies.messages.sendAccountDeletionNotice(
      account.email,
      scheduledAt,
    );
  }

  private async loadAccount(accountId: string): Promise<Account> {
    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    return account;
  }

  private async verifyCurrentPassword(
    account: Account,
    raw: string,
  ): Promise<void> {
    let password: PlainPassword;

    try {
      password = PlainPassword.create(raw);
    } catch {
      await this.dependencies.passwordHasher.verifyDecoy();
      throw new CurrentPasswordRejectedError();
    }

    if (
      !(await this.dependencies.passwordHasher.matches(
        password,
        account.passwordHash,
      ))
    ) {
      throw new CurrentPasswordRejectedError();
    }
  }
}
