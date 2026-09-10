import { DomainError } from '../../../../shared/domain/domain-error';

export class MessageDeliveryFailedError extends DomainError {
  constructor() {
    super();
  }
}
