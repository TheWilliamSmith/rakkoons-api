import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { MessageSender } from '../domain/ports/message-sender';
import { Username } from '../domain/value-objects/username';
import { dispatchNotice } from './notice-dispatch';

export interface ChangeUsernameInput {
  accountId: string;
  username: string;
}

interface ChangeUsernameDependencies {
  accounts: AccountRepository;
  messages: MessageSender;
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

    if (account.username.equals(username)) {
      return;
    }

    account.changeUsername(username, this.dependencies.clock.now());
    await this.dependencies.accounts.save(account);

    dispatchNotice(
      this.dependencies.messages.sendUsernameChanged(account.email, username),
    );
  }
}
