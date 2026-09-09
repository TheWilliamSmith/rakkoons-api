import { DomainError } from '../../../../shared/domain/domain-error';

export class InvalidVerificationCodeError extends DomainError {
  constructor() {
    super();
  }
}
