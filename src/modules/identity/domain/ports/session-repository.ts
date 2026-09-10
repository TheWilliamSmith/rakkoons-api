import { Session } from '../session/session';

export interface SessionRepository {
  add(session: Session): Promise<void>;
  save(session: Session): Promise<void>;
  findByIdentifierHash(identifierHash: string): Promise<Session | null>;
  findByIdForAccount(id: string, accountId: string): Promise<Session | null>;
  listActiveForAccount(accountId: string, usableAt: Date): Promise<Session[]>;
  revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void>;
  revokeAllForAccountExcept(
    accountId: string,
    keptSessionId: string,
    revokedAt: Date,
  ): Promise<void>;
}
