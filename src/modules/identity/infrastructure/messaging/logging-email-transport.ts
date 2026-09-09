import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EmailTransport, OutboundEmail } from './outbound-email';

@Injectable()
export class LoggingEmailTransport implements EmailTransport {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingEmailTransport.name);
  }

  send(email: OutboundEmail): Promise<void> {
    this.logger.info(
      {
        recipientDomain: recipientDomain(email.recipient),
        subject: email.subject,
      },
      'email not dispatched, no mail provider configured',
    );

    return Promise.resolve();
  }
}

function recipientDomain(recipient: string): string {
  return recipient.split('@')[1] ?? 'unknown';
}
