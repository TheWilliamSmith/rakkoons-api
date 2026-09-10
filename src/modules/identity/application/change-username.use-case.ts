import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { Username } from '../domain/value-objects/username';

export interface ChangeUsernameInput {
  accountId: string;
  username: string;
}

interface ChangeUsernameDependencies {
  accounts: AccountRepository;
  clock: Clock;
}

export class ChangeUsernameUseCase {
  constructor(private readonly dependencies: ChangeUsernameDependencies) {}

  async execute(input: ChangeUsernameInput): Promise<void> {
    const username = Username.create(input.username);
    const account = await this.dependencies.accounts.findById(input.accountId);

    if (account === null) {
      throw new SessionNotEstablishedError();
    }

    account.changeUsername(username, this.dependencies.clock.now());
    await this.dependencies.accounts.save(account);
  }
}
