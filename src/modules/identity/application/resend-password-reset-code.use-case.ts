import { Account } from '../domain/account/account';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationCodeResender } from './verification-code-resender';

export interface ResendPasswordResetCodeInput {
  journeyId: string | null;
}

interface ResendPasswordResetCodeDependencies {
  accounts: AccountRepository;
  resender: VerificationCodeResender;
  passwordHasher: PasswordHasher;
  messages: MessageSender;
  clock: Clock;
}

export class ResendPasswordResetCodeUseCase {
  constructor(
    private readonly dependencies: ResendPasswordResetCodeDependencies,
  ) {}

  async execute(input: ResendPasswordResetCodeInput): Promise<void> {
    const journey = await this.dependencies.resender.load(
      input.journeyId,
      VerificationPurpose.PasswordReset,
    );

    if (journey === null) {
      await this.dependencies.passwordHasher.verifyDecoy();
      return;
    }

    const account = await this.findEligibleAccount(journey.accountId);

    if (account === null) {
      await this.dependencies.passwordHasher.verifyDecoy();
      return;
    }

    const code = await this.dependencies.resender.renew(
      journey,
      this.dependencies.clock.now(),
    );

    await this.dependencies.messages.sendPasswordResetCode(account.email, code);
  }

  private async findEligibleAccount(
    accountId: string | null,
  ): Promise<Account | null> {
    if (accountId === null) {
      return null;
    }

    const account = await this.dependencies.accounts.findById(accountId);

    return account !== null && account.isActive() ? account : null;
  }
}
