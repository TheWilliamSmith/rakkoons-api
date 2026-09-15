import { VerificationCodeGenerator } from '@identity/domain/ports/verification-code-generator';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export class FixedVerificationCodeGenerator implements VerificationCodeGenerator {
  generatedCount = 0;

  constructor(private value: string) {}

  useNext(value: string): void {
    this.value = value;
  }

  generate(): VerificationCode {
    this.generatedCount += 1;
    return VerificationCode.create(this.value);
  }
}
