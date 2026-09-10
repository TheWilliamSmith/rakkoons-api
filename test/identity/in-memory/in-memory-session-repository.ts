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

  findByIdForAccount(id: string, accountId: string): Promise<Session | null> {
    const session = this.sessions.get(id);

    return Promise.resolve(
      session !== undefined && session.accountId === accountId ? session : null,
    );
  }

  listActiveForAccount(accountId: string, usableAt: Date): Promise<Session[]> {
    return Promise.resolve(
      [...this.sessions.values()]
        .filter(
          (session) =>
            session.accountId === accountId && session.isUsableAt(usableAt),
        )
        .sort(
          (one, other) => other.lastUsedAt.getTime() - one.lastUsedAt.getTime(),
        ),
    );
  }

  revokeAllForAccountExcept(
    accountId: string,
    keptSessionId: string,
    revokedAt: Date,
  ): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.accountId === accountId && session.id !== keptSessionId) {
        session.revoke(revokedAt);
      }
    }

    return Promise.resolve();
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
