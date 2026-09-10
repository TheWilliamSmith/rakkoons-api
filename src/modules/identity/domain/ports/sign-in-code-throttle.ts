import { EmailAddress } from '../value-objects/email-address';

export interface SignInCodeThrottle {
  allowsCodeFor(recipient: EmailAddress, origin: string): Promise<boolean>;
}
