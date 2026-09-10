import { EmailCopy } from '../content/email-copy';
import { signInCodeEmail } from './sign-in-code.email';

const CODE = '429861';
const VALIDITY_MINUTES = 10;

describe('signInCodeEmail', () => {
  const email = signInCodeEmail(CODE, VALIDITY_MINUTES);

  it('porte le code dans les deux versions du message', () => {
    expect(email.html).toContain(CODE);
    expect(email.text).toContain(CODE);
  });

  it('annonce la durée de validité venue de la configuration', () => {
    expect(email.text).toContain('dix minutes');
  });

  it('reprend l objet du module de contenu', () => {
    expect(email.subject).toBe(EmailCopy.signInCode.subject);
  });

  it('porte un objet court, sans emoji, sans point final et sans le code', () => {
    expect(email.subject).not.toMatch(/[.!?]$/);
    expect(email.subject).not.toContain(CODE);
    expect(email.subject.length).toBeLessThanOrEqual(60);
  });

  it('dit quoi faire quand on n est pas à l origine de la demande', () => {
    expect(email.text).toContain("Si vous n'êtes pas à l'origine");
  });
});
