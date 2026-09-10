import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';

export interface ReadAccountInput {
  accountId: string;
}

export interface ReadAccountOutput {
  username: string;
  email: string;
  createdAt: Date;
}

export class ReadAccountUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(input: ReadAccountInput): Promise<ReadAccountOutput> {
    const account = await this.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    return {
      username: account.username.toString(),
      email: account.email.toString(),
      createdAt: account.createdAt,
    };
  }
}
