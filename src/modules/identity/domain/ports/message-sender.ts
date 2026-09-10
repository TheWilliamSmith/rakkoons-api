import { EmailAddress } from '../value-objects/email-address';
import { VerificationCode } from '../value-objects/verification-code';

export interface MessageSender {
  sendRegistrationCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
  sendPasswordResetCode(
    recipient: EmailAddress,
    code: VerificationCode,
  ): Promise<void>;
}
