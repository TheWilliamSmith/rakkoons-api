import { DomainError } from '../../../../shared/domain/domain-error';

export class SignInCodeRejectedError extends DomainError {
  constructor() {
    super();
  }
}
