import { MessageSender } from '@identity/domain/ports/message-sender';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';

export interface RecordedCode {
  recipient: string;
  code: string;
}

export class RecordingMessageSender implements MessageSender {
  readonly registrationCodes: RecordedCode[] = [];
  readonly signInCodes: RecordedCode[] = [];
  readonly passwordResetCodes: RecordedCode[] = [];
  readonly emailChangeCodes: RecordedCode[] = [];
  readonly emailChangeNotices: { recipient: string; newAddress: string }[] = [];
  readonly deletionNotices: { recipient: string; scheduledAt: Date }[] = [];

  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.registrationCodes.push(record(recipient, code));
    return Promise.resolve();
  }

  sendSignInCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.signInCodes.push(record(recipient, code));
    return Promise.resolve();
  }

  sendEmailChangeCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void> {
    this.emailChangeCodes.push(record(recipient, code));
    return Promise.resolve();
  }

  sendEmailChangeNotice(
    previousRecipient: EmailAddress,
    newAddress: EmailAddress,
  ): Promise<void> {
    this.emailChangeNotices.push({
      recipient: previousRecipient.toString(),
      newAddress: newAddress.toString(),
    });
    return Promise.resolve();
  }

  sendAccountDeletionNotice(
    recipient: EmailAddress,
    scheduledAt: Date,
  ): Promise<void> {
    this.deletionNotices.push({ recipient: recipient.toString(), scheduledAt });
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
