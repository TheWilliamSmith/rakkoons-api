import { signInCodeEmail } from './sign-in-code.email';
import { EmailPalette } from './email-theme';

const CODE = '429861';
const VALIDITY_MINUTES = 10;

describe('signInCodeEmail', () => {
  const email = signInCodeEmail(CODE, VALIDITY_MINUTES);

  it('porte le code dans les deux versions du message', () => {
    expect(email.html).toContain(CODE);
    expect(email.text).toContain(CODE);
  });

  it('annonce la durée de validité venue de la configuration', () => {
    expect(email.text).toContain(`${VALIDITY_MINUTES} minutes`);
  });

  it('annonce la connexion dans le sujet', () => {
    expect(email.subject).toContain('connexion');
    expect(email.subject).toContain('Rakkoons');
  });

  it('dit quoi faire quand on n est pas à l origine de la demande', () => {
    expect(email.text).toContain("Si vous n'êtes pas à l'origine");
  });

  it('n invite jamais à cliquer sur un bouton', () => {
    expect(email.html).not.toContain('<a ');
  });

  it('habille le message avec les valeurs de la charte écrites en dur', () => {
    expect(email.html).toContain(EmailPalette.Mist);
    expect(email.html).toContain(EmailPalette.Brand);
    expect(email.html).not.toContain('var(--');
  });
});
