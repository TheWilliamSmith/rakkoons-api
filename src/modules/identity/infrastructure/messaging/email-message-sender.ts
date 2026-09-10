import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { type Env } from '../../../../config/env.validation';
import { MessageDeliveryFailedError } from '../../domain/errors/message-delivery-failed.error';
import { MessageSender } from '../../domain/ports/message-sender';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { VerificationCode } from '../../domain/value-objects/verification-code';
import { IdentityToken } from '../../identity.tokens';
import { type EmailContent, type EmailTransport } from './outbound-email';
import { passwordResetCodeEmail } from './templates/password-reset-code.email';
import { registrationCodeEmail } from './templates/registration-code.email';

@Injectable()
export class EmailMessageSender implements MessageSender {
  constructor(
    @Inject(IdentityToken.EmailTransport)
    private readonly transport: EmailTransport,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailMessageSender.name);
  }

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      registrationCodeEmail(
        code.reveal(),
        this.config.get('SIGNUP_CODE_TTL_MINUTES', { infer: true }),
      ),
    );
  }

  sendPasswordResetCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      passwordResetCodeEmail(
        code.reveal(),
        this.config.get('PASSWORD_RESET_CODE_TTL_MINUTES', { infer: true }),
      ),
    );
  }

  private async dispatch(
    recipient: EmailAddress,
    content: EmailContent,
  ): Promise<void> {
    try {
      await this.transport.send({
        ...content,
        recipient: recipient.toString(),
      });
    } catch (failure) {
      this.logger.error(
        {
          err: failure,
          recipientDomain: recipient.toString().split('@')[1] ?? 'unknown',
          subject: content.subject,
        },
        'email dispatch failed',
      );

      throw new MessageDeliveryFailedError();
    }
  }
}
