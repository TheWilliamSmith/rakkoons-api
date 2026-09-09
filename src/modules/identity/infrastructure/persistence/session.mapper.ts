import { Session } from '../../domain/session/session';
import { PasswordHash } from '../../domain/value-objects/password-hash';

export interface SessionRecord {
  id: string;
  accountId: string;
  identifierHash: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  createdAt: Date;
}

export const SESSION_SELECTION = {
  id: true,
  accountId: true,
  identifierHash: true,
  expiresAt: true,
  absoluteExpiresAt: true,
  revokedAt: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

export class SessionMapper {
  static toDomain(record: SessionRecord): Session {
    return Session.restore({
      id: record.id,
      accountId: record.accountId,
      identifierHash: PasswordHash.fromStoredValue(record.identifierHash),
      expiresAt: record.expiresAt,
      absoluteExpiresAt: record.absoluteExpiresAt,
      revokedAt: record.revokedAt,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.createdAt,
    });
  }

  static toRecord(session: Session): SessionRecord {
    return {
      id: session.id,
      accountId: session.accountId,
      identifierHash: session.identifierHash.toString(),
      expiresAt: session.expiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      revokedAt: session.revokedAt,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
    };
  }
}
