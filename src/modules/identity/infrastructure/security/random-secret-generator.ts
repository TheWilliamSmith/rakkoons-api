import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../domain/ports/secret-generator';

const SECRET_BYTE_LENGTH = 32;
const SECRET_ENCODING = 'base64url';

@Injectable()
export class RandomSecretGenerator implements SecretGenerator {
  generate(): string {
    return randomBytes(SECRET_BYTE_LENGTH).toString(SECRET_ENCODING);
  }
}
