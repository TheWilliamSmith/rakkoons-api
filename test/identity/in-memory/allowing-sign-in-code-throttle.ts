import { SignInCodeThrottle } from '@identity/domain/ports/sign-in-code-throttle';
import { EmailAddress } from '@identity/domain/value-objects/email-address';

export class AllowingSignInCodeThrottle implements SignInCodeThrottle {
  readonly consulted: { recipient: string; origin: string }[] = [];
  allows = true;

  allowsCodeFor(recipient: EmailAddress, origin: string): Promise<boolean> {
    this.consulted.push({ recipient: recipient.toString(), origin });
    return Promise.resolve(this.allows);
  }
}
