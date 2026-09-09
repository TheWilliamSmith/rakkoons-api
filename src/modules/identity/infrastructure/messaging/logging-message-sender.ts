import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { MessageSender } from '../../domain/ports/message-sender';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { VerificationCode } from '../../domain/value-objects/verification-code';

@Injectable()
export class LoggingMessageSender implements MessageSender {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingMessageSender.name);
  }

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.logger.info(
      { recipientHint: this.hint(recipient), codeLength: code.reveal().length },
      'registration code dispatched',
    );
    return Promise.resolve();
  }

  sendRegistrationAttemptOnExistingAccount(
    recipient: EmailAddress,
  ): Promise<void> {
    this.logger.info(
      { recipientHint: this.hint(recipient) },
      'registration attempt on existing account dispatched',
    );
    return Promise.resolve();
  }

  private hint(recipient: EmailAddress): string {
    return recipient.toString().split('@')[1] ?? 'unknown';
  }
}
