import { DomainError } from '../../../../shared/domain/domain-error';

export class PasswordResetCodeRejectedError extends DomainError {
  constructor() {
    super();
  }
}
