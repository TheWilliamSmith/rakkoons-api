import { InvalidVerificationCodeError } from '../errors/invalid-verification-code.error';

const VERIFICATION_CODE_PATTERN = /^[0-9]{6}$/;
const REDACTED = '[redacted]';
const NODE_INSPECT = Symbol.for('nodejs.util.inspect.custom');

export class VerificationCode {
  private constructor(private readonly value: string) {}

  static create(raw: string): VerificationCode {
    const normalized = raw.trim();

    if (!VERIFICATION_CODE_PATTERN.test(normalized)) {
      throw new InvalidVerificationCodeError();
    }

    return new VerificationCode(normalized);
  }

  reveal(): string {
    return this.value;
  }

  toJSON(): string {
    return REDACTED;
  }

  toString(): string {
    return REDACTED;
  }

  [NODE_INSPECT](): string {
    return REDACTED;
  }
}
