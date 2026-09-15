import { Account } from '../domain/account/account';
import { VerificationCodeRejectedError } from '../domain/errors/verification-code-rejected.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationCodeResender } from './verification-code-resender';

export interface ResendRegistrationCodeInput {
  journeyId: string | null;
}

interface ResendRegistrationCodeDependencies {
  accounts: AccountRepository;
  resender: VerificationCodeResender;
  messages: MessageSender;
  clock: Clock;
}

export class ResendRegistrationCodeUseCase {
  constructor(
    private readonly dependencies: ResendRegistrationCodeDependencies,
  ) {}

  async execute(input: ResendRegistrationCodeInput): Promise<void> {
    const journey = await this.dependencies.resender.load(
      input.journeyId,
      VerificationPurpose.SignUp,
    );

    if (journey === null) {
      throw new VerificationCodeRejectedError();
    }

    const account = await this.loadPendingAccount(journey.accountId);
    const code = await this.dependencies.resender.renew(
      journey,
      this.dependencies.clock.now(),
    );

    await this.dependencies.messages.sendRegistrationCode(account.email, code);
  }

  private async loadPendingAccount(accountId: string | null): Promise<Account> {
    if (accountId === null) {
      throw new VerificationCodeRejectedError();
    }

    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null || account.isActive()) {
      throw new VerificationCodeRejectedError();
    }

    return account;
  }
}
