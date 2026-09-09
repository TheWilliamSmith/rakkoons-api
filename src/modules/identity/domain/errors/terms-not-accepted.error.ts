import { DomainError } from '../../../../shared/domain/domain-error';

export class TermsNotAcceptedError extends DomainError {
  constructor() {
    super();
  }
}
