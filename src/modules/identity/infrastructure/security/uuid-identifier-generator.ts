import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdentifierGenerator } from '../../domain/ports/identifier-generator';

@Injectable()
export class UuidIdentifierGenerator implements IdentifierGenerator {
  generate(): string {
    return randomUUID();
  }
}
