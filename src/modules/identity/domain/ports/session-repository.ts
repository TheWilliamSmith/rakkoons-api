import { Session } from '../session/session';

export interface SessionRepository {
  add(session: Session): Promise<void>;
  save(session: Session): Promise<void>;
  findByIdentifierHash(identifierHash: string): Promise<Session | null>;
  revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void>;
}
