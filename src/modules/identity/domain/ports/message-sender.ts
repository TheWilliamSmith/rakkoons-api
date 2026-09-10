import { EmailAddress } from '../value-objects/email-address';
import { VerificationCode } from '../value-objects/verification-code';

export interface MessageSender {
  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
  sendSignInCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
  sendEmailChangeCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
  sendEmailChangeNotice(
    previousRecipient: EmailAddress,
    newAddress: EmailAddress,
  ): Promise<void>;
  sendAccountDeletionNotice(
    recipient: EmailAddress,
    scheduledAt: Date,
  ): Promise<void>;
  sendPasswordResetCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
}
