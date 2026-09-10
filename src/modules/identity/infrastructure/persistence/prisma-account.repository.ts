import { Injectable } from '@nestjs/common';
import { isUuid } from './uuid';
import { PrismaTransactionContext } from '../../../../shared/infrastructure/prisma/prisma-transaction-context';
import { Account } from '../../domain/account/account';
import { AccountRepository } from '../../domain/ports/account-repository';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { Username } from '../../domain/value-objects/username';
import { ACCOUNT_SELECTION, AccountMapper } from './account.mapper';
import { translateUniqueViolation } from './unique-violation';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly context: PrismaTransactionContext) {}

  async isUsernameAvailable(username: Username): Promise<boolean> {
    const found = await this.context.client().account.findUnique({
      where: { username: username.toString() },
      select: { id: true },
    });

    return found === null;
  }

  async findByEmail(email: EmailAddress): Promise<Account | null> {
    const record = await this.context.client().account.findUnique({
      where: { email: email.toString() },
      select: ACCOUNT_SELECTION,
    });

    return record === null ? null : AccountMapper.toDomain(record);
  }

  async findById(id: string): Promise<Account | null> {
    if (!isUuid(id)) {
      return null;
    }

    const record = await this.context.client().account.findUnique({
      where: { id },
      select: ACCOUNT_SELECTION,
    });

    return record === null ? null : AccountMapper.toDomain(record);
  }

  async add(account: Account): Promise<void> {
    await this.context
      .client()
      .account.create({ data: AccountMapper.toRecord(account) })
      .catch(translateUniqueViolation);
  }

  async listScheduledForDeletionBefore(instant: Date): Promise<Account[]> {
    const records = await this.context.client().account.findMany({
      where: { deletionScheduledAt: { not: null, lte: instant } },
      select: ACCOUNT_SELECTION,
    });

    return records.map((record) => AccountMapper.toDomain(record));
  }

  async remove(accountId: string): Promise<void> {
    await this.context.client().account.delete({ where: { id: accountId } });
  }

  async save(account: Account): Promise<void> {
    const record = AccountMapper.toRecord(account);

    await this.context
      .client()
      .account.update({ where: { id: record.id }, data: record })
      .catch(translateUniqueViolation);
  }
}
