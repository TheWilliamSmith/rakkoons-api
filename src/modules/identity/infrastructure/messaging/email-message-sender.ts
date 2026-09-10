import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { type Env } from '../../../../config/env.validation';
import { MessageDeliveryFailedError } from '../../domain/errors/message-delivery-failed.error';
import { MessageSender } from '../../domain/ports/message-sender';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { Username } from '../../domain/value-objects/username';
import { VerificationCode } from '../../domain/value-objects/verification-code';
import { IdentityToken } from '../../identity.tokens';
import { type EmailContent, type EmailTransport } from './outbound-email';
import { passwordResetCodeEmail } from './templates/password-reset-code.email';
import { accountDeletionCancelledEmail } from './templates/account-deletion-cancelled.email';
import { accountDeletionNoticeEmail } from './templates/account-deletion-notice.email';
import { passwordChangedEmail } from './templates/password-changed.email';
import { passwordResetCompletedEmail } from './templates/password-reset-completed.email';
import { registrationConfirmedEmail } from './templates/registration-confirmed.email';
import { usernameChangedEmail } from './templates/username-changed.email';
import { emailChangeCodeEmail } from './templates/email-change-code.email';
import { emailChangeNoticeEmail } from './templates/email-change-notice.email';
import { registrationCodeEmail } from './templates/registration-code.email';
import { signInCodeEmail } from './templates/sign-in-code.email';

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

  sendSignInCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      signInCodeEmail(
        code.reveal(),
        this.config.get('SIGNIN_CODE_TTL_MINUTES', { infer: true }),
      ),
    );
  }

  sendRegistrationConfirmed(
    recipient: EmailAddress,
    username: Username,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      registrationConfirmedEmail(username.toString()),
    );
  }

  sendPasswordChanged(recipient: EmailAddress): Promise<void> {
    return this.dispatch(recipient, passwordChangedEmail());
  }

  sendPasswordResetCompleted(recipient: EmailAddress): Promise<void> {
    return this.dispatch(recipient, passwordResetCompletedEmail());
  }

  sendUsernameChanged(
    recipient: EmailAddress,
    username: Username,
  ): Promise<void> {
    return this.dispatch(recipient, usernameChangedEmail(username.toString()));
  }

  sendAccountDeletionCancelled(recipient: EmailAddress): Promise<void> {
    return this.dispatch(recipient, accountDeletionCancelledEmail());
  }

  sendEmailChangeCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      emailChangeCodeEmail(
        code.reveal(),
        this.config.get('EMAIL_CHANGE_CODE_TTL_MINUTES', { infer: true }),
      ),
    );
  }

  sendEmailChangeNotice(
    previousRecipient: EmailAddress,
    newAddress: EmailAddress,
  ): Promise<void> {
    return this.dispatch(
      previousRecipient,
      emailChangeNoticeEmail(newAddress.toString()),
    );
  }

  sendAccountDeletionNotice(
    recipient: EmailAddress,
    scheduledAt: Date,
  ): Promise<void> {
    return this.dispatch(
      recipient,
      accountDeletionNoticeEmail(scheduledAt.toISOString().slice(0, 10)),
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
