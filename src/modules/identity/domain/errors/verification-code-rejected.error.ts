import { DomainError } from '../../../../shared/domain/domain-error';

export class VerificationCodeRejectedError extends DomainError {
  constructor() {
    super();
  }
}
