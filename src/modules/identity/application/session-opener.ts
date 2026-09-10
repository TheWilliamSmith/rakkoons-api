import { Account } from '../domain/account/account';
import { Clock } from '../domain/ports/clock';
import { IdentifierGenerator } from '../domain/ports/identifier-generator';
import { SecretGenerator } from '../domain/ports/secret-generator';
import { SecretHasher } from '../domain/ports/secret-hasher';
import { SessionRepository } from '../domain/ports/session-repository';
import { Session } from '../domain/session/session';
import { SessionPolicy } from './identity-policy';

export interface OpenedSession {
  sessionIdentifier: string;
  expiresAt: Date;
}

interface SessionOpenerDependencies {
  sessions: SessionRepository;
  secretHasher: SecretHasher;
  identifiers: IdentifierGenerator;
  secrets: SecretGenerator;
  clock: Clock;
  policy: SessionPolicy;
}

export class SessionOpener {
  constructor(private readonly dependencies: SessionOpenerDependencies) {}

  async openFor(account: Account): Promise<OpenedSession> {
    const identifier = this.dependencies.secrets.generate();
    const identifierHash =
      await this.dependencies.secretHasher.hash(identifier);

    const session = Session.open({
      id: this.dependencies.identifiers.generate(),
      accountId: account.id,
      identifierHash,
      slidingLifetime: this.dependencies.policy.slidingLifetime,
      absoluteLifetime: this.dependencies.policy.absoluteLifetime,
      openedAt: this.dependencies.clock.now(),
    });

    await this.dependencies.sessions.add(session);

    return { sessionIdentifier: identifier, expiresAt: session.expiresAt };
  }
}
