import { VerificationCode } from '../value-objects/verification-code';

export interface VerificationCodeGenerator {
  generate(): VerificationCode;
}
