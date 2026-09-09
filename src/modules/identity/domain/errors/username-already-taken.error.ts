import { DomainError } from '../../../../shared/domain/domain-error';

export class UsernameAlreadyTakenError extends DomainError {
  constructor() {
    super();
  }
}
