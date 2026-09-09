import { DomainError } from '../../../../shared/domain/domain-error';

export class VerificationJourneyNotFoundError extends DomainError {
  constructor() {
    super();
  }
}
