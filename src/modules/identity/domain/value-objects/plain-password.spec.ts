import { PasswordTooShortError } from '../errors/password-too-short.error';
import { PlainPassword } from './plain-password';

describe('PlainPassword', () => {
  it('accepte un mot de passe de douze caractères sans règle de composition', () => {
    expect(PlainPassword.create('douzecaracte').reveal()).toBe('douzecaracte');
  });

  it('refuse un mot de passe de onze caractères', () => {
    expect(() => PlainPassword.create('onzecaract')).toThrow(
      PasswordTooShortError,
    );
  });

  it('ne révèle jamais sa valeur à la sérialisation', () => {
    const password = PlainPassword.create('MotDePasseQuiGagne1');

    expect(JSON.stringify({ password })).not.toContain('MotDePasseQuiGagne1');
    expect(password.toString()).not.toContain('MotDePasseQuiGagne1');
  });
});
