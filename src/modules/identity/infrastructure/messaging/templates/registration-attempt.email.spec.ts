import { registrationAttemptEmail } from './registration-attempt.email';

describe('registrationAttemptEmail', () => {
  const email = registrationAttemptEmail();

  it('annonce qu aucun compte ni code n a été créé', () => {
    expect(email.text).toContain("aucun nouveau compte n'a été créé");
    expect(email.text).toContain("aucun code n'a été envoyé");
  });

  it('ne contient aucune suite de six chiffres qui ressemblerait à un code', () => {
    expect(email.html).not.toMatch(/\b\d{6}\b/);
    expect(email.text).not.toMatch(/\b\d{6}\b/);
  });

  it('ne divulgue pas le nom d utilisateur du titulaire', () => {
    expect(email.text.toLowerCase()).not.toContain('utilisateur :');
  });
});
