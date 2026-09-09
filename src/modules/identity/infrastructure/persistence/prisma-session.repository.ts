import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/infrastructure/prisma/prisma-transaction-context';
import { SessionRepository } from '../../domain/ports/session-repository';
import { Session } from '../../domain/session/session';
import { SESSION_SELECTION, SessionMapper } from './session.mapper';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly context: PrismaTransactionContext) {}

  async add(session: Session): Promise<void> {
    await this.context
      .client()
      .session.create({ data: SessionMapper.toRecord(session) });
  }

  async save(session: Session): Promise<void> {
    const record = SessionMapper.toRecord(session);

    await this.context
      .client()
      .session.update({ where: { id: record.id }, data: record });
  }

  async findByIdentifierHash(identifierHash: string): Promise<Session | null> {
    const record = await this.context.client().session.findUnique({
      where: { identifierHash },
      select: SESSION_SELECTION,
    });

    return record === null ? null : SessionMapper.toDomain(record);
  }

  async revokeAllForAccount(accountId: string, revokedAt: Date): Promise<void> {
    await this.context.client().session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
