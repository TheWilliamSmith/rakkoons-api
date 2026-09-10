import { DomainError } from '../../../../shared/domain/domain-error';

export class WeakPasswordError extends DomainError {
  constructor() {
    super();
  }
}
