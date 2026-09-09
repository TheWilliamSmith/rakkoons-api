import { SessionRepository } from '@identity/domain/ports/session-repository';
import { Session } from '@identity/domain/session/session';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  add(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    return Promise.resolve();
  }

  save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    return Promise.resolve();
  }

  findByIdentifierHash(identifierHash: string): Promise<Session | null> {
    return Promise.resolve(
      [...this.sessions.values()].find(
        (session) => session.identifierHash.toString() === identifierHash,
      ) ?? null,
    );
  }

  revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.accountId === accountId) {
        session.revoke(revokedAt);
      }
    }
    return Promise.resolve();
  }

  count(): number {
    return this.sessions.size;
  }
}
