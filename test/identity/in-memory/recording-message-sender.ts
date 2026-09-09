import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export class RecordingMessageSender implements MessageSender {
  readonly registrationCodes: { recipient: string; code: string }[] = [];
  readonly existingAccountNotices: string[] = [];

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.registrationCodes.push({
      recipient: recipient.toString(),
      code: code.reveal(),
    });
    return Promise.resolve();
  }

  sendRegistrationAttemptOnExistingAccount(
    recipient: EmailAddress,
  ): Promise<void> {
    this.existingAccountNotices.push(recipient.toString());
    return Promise.resolve();
  }
}
