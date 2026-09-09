import { IdentifierGenerator } from '@identity/domain/ports/identifier-generator';

export class SequentialIdentifierGenerator implements IdentifierGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `identifier-${this.counter}`;
  }
}
