import { registrationCodeEmail } from './registration-code.email';

const CODE = '429861';
const VALIDITY_MINUTES = 10;

describe('registrationCodeEmail', () => {
  const email = registrationCodeEmail(CODE, VALIDITY_MINUTES);

  it('porte le code dans les deux versions du message', () => {
    expect(email.html).toContain(CODE);
    expect(email.text).toContain(CODE);
  });

  it('annonce la durée de validité venue de la configuration', () => {
    expect(email.text).toContain(`${VALIDITY_MINUTES} minutes`);
  });

  it('nomme la marque dans le sujet', () => {
    expect(email.subject).toContain('Rakkoons');
  });

  it('dit quoi faire quand on n est pas à l origine de la demande', () => {
    expect(email.text).toContain("Si vous n'êtes pas à l'origine");
  });
});
