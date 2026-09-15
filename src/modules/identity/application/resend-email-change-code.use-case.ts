import { EmailChangeCodeRejectedError } from '../domain/errors/email-change-code-rejected.error';
import { EmailChangeNotRequestedError } from '../domain/errors/email-change-not-requested.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { EmailAddress } from '../domain/value-objects/email-address';
import { VerificationPurpose } from '../domain/verification/verification-purpose';
import { VerificationCodeResender } from './verification-code-resender';

export interface ResendEmailChangeCodeInput {
  accountId: string;
  journeyId: string | null;
}

interface ResendEmailChangeCodeDependencies {
  accounts: AccountRepository;
  resender: VerificationCodeResender;
  messages: MessageSender;
  clock: Clock;
}

export class ResendEmailChangeCodeUseCase {
  constructor(
    private readonly dependencies: ResendEmailChangeCodeDependencies,
  ) {}

  async execute(input: ResendEmailChangeCodeInput): Promise<void> {
    const journey = await this.dependencies.resender.load(
      input.journeyId,
      VerificationPurpose.EmailChange,
    );

    if (journey === null || journey.accountId !== input.accountId) {
      throw new EmailChangeCodeRejectedError();
    }

    const pendingEmail = await this.loadPendingEmail(input.accountId);
    const code = await this.dependencies.resender.renew(
      journey,
      this.dependencies.clock.now(),
    );

    await this.dependencies.messages.sendEmailChangeCode(pendingEmail, code);
  }

  private async loadPendingEmail(accountId: string): Promise<EmailAddress> {
    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null) {
      throw new EmailChangeCodeRejectedError();
    }

    if (account.pendingEmail === null) {
      throw new EmailChangeNotRequestedError();
    }

    return account.pendingEmail;
  }
}
