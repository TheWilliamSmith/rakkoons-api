import { Injectable } from '@nestjs/common';
import { isUuid } from './uuid';
import { PrismaTransactionContext } from '../../../../shared/infrastructure/prisma/prisma-transaction-context';
import { VerificationJourneyRepository } from '../../domain/ports/verification-journey-repository';
import { VerificationJourney } from '../../domain/verification/verification-journey';
import {
  VERIFICATION_JOURNEY_SELECTION,
  VerificationJourneyMapper,
} from './verification-journey.mapper';

@Injectable()
export class PrismaVerificationJourneyRepository implements VerificationJourneyRepository {
  constructor(private readonly context: PrismaTransactionContext) {}

  async findById(id: string): Promise<VerificationJourney | null> {
    if (!isUuid(id)) {
      return null;
    }

    const record = await this.context.client().verificationJourney.findUnique({
      where: { id },
      select: VERIFICATION_JOURNEY_SELECTION,
    });

    return record === null ? null : VerificationJourneyMapper.toDomain(record);
  }

  async add(journey: VerificationJourney): Promise<void> {
    await this.context.client().verificationJourney.create({
      data: VerificationJourneyMapper.toRecord(journey),
    });
  }

  async save(journey: VerificationJourney): Promise<void> {
    const record = VerificationJourneyMapper.toRecord(journey);

    await this.context
      .client()
      .verificationJourney.update({ where: { id: record.id }, data: record });
  }
}
