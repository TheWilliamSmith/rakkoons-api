import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { VerificationCodeGenerator } from '../../domain/ports/verification-code-generator';
import { VerificationCode } from '../../domain/value-objects/verification-code';

const CODE_LENGTH = 6;
const CODE_UPPER_BOUND = 10 ** CODE_LENGTH;

@Injectable()
export class RandomVerificationCodeGenerator implements VerificationCodeGenerator {
  generate(): VerificationCode {
    return VerificationCode.create(
      randomInt(0, CODE_UPPER_BOUND).toString().padStart(CODE_LENGTH, '0'),
    );
  }
}
