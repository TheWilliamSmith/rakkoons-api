import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export interface RecordedCode {
  recipient: string;
  code: string;
}

export class RecordingMessageSender implements MessageSender {
  readonly registrationCodes: RecordedCode[] = [];
  readonly passwordResetCodes: RecordedCode[] = [];

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.registrationCodes.push(record(recipient, code));
    return Promise.resolve();
  }

  sendPasswordResetCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.passwordResetCodes.push(record(recipient, code));
    return Promise.resolve();
  }
}

function record(recipient: EmailAddress, code: VerificationCode): RecordedCode {
  return { recipient: recipient.toString(), code: code.reveal() };
}
