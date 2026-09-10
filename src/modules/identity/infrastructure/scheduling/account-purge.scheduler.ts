import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { PurgeDueAccountsUseCase } from '../../application/purge-due-accounts.use-case';

@Injectable()
export class AccountPurgeScheduler {
  constructor(
    private readonly purgeDueAccounts: PurgeDueAccountsUseCase,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AccountPurgeScheduler.name);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purge(): Promise<void> {
    try {
      const outcome = await this.purgeDueAccounts.execute();

      if (outcome.purgedCount > 0) {
        this.logger.info(
          { purgedCount: outcome.purgedCount },
          'scheduled accounts purged',
        );
      }
    } catch (failure) {
      this.logger.error({ err: failure }, 'scheduled account purge failed');
    }
  }
}
