import { Account } from '../domain/account/account';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { AccountRepository } from '../domain/ports/account-repository';
import { Clock } from '../domain/ports/clock';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { Session } from '../domain/session/session';
import { SessionPolicy } from './identity-policy';

export interface AuthenticateSessionInput {
  sessionIdentifier: string | null;
}

export interface AuthenticateSessionOutput {
  accountId: string;
  sessionId: string;
  username: string;
}

interface AuthenticateSessionDependencies {
  accounts: AccountRepository;
  sessions: SessionRepository;
  secretHasher: SecretHasher;
  clock: Clock;
  policy: SessionPolicy;
}

export class AuthenticateSessionUseCase {
  constructor(private readonly dependencies: AuthenticateSessionDependencies) {}

  async execute(
    input: AuthenticateSessionInput,
  ): Promise<AuthenticateSessionOutput> {
    const usedAt = this.dependencies.clock.now();
    const session = await this.loadUsableSession(
      input.sessionIdentifier,
      usedAt,
    );
    const account = await this.loadActiveAccount(session.accountId);

    session.extend(usedAt, this.dependencies.policy.slidingLifetime);
    await this.dependencies.sessions.save(session);

    return {
      accountId: account.id,
      sessionId: session.id,
      username: account.username.toString(),
    };
  }

  private async loadUsableSession(
    identifier: string | null,
    usedAt: Date,
  ): Promise<Session> {
    if (identifier === null) {
      throw new SessionNotEstablishedError();
    }

    const digest = await this.dependencies.secretHasher.hash(identifier);
    const session = await this.dependencies.sessions.findByIdentifierHash(
      digest.toString(),
    );

    if (session === null || !session.isUsableAt(usedAt)) {
      throw new SessionNotEstablishedError();
    }

    return session;
  }

  private async loadActiveAccount(accountId: string): Promise<Account> {
    const account = await this.dependencies.accounts.findById(accountId);

    if (account === null || !account.isActive()) {
      throw new SessionNotEstablishedError();
    }

    return account;
  }
}
