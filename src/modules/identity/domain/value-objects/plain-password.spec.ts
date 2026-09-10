import { WeakPasswordError } from '../errors/weak-password.error';
import { PlainPassword } from './plain-password';

const VALID = 'MotDePasseQuiGagne1!';

describe('PlainPassword', () => {
  it('accepte un mot de passe long et composé des quatre familles', () => {
    expect(PlainPassword.create(VALID).reveal()).toBe(VALID);
  });

  it('refuse un mot de passe de onze caractères', () => {
    expect(() => PlainPassword.create('Onzecaract1!')).not.toThrow();
    expect(() => PlainPassword.create('Onzecarac1!')).toThrow(
      WeakPasswordError,
    );
  });

  it('refuse un mot de passe sans majuscule', () => {
    expect(() => PlainPassword.create('motdepassequigagne1!')).toThrow(
      WeakPasswordError,
    );
  });

  it('refuse un mot de passe sans minuscule', () => {
    expect(() => PlainPassword.create('MOTDEPASSEQUIGAGNE1!')).toThrow(
      WeakPasswordError,
    );
  });

  it('refuse un mot de passe sans chiffre', () => {
    expect(() => PlainPassword.create('MotDePasseQuiGagne!')).toThrow(
      WeakPasswordError,
    );
  });

  it('refuse un mot de passe sans caractère spécial', () => {
    expect(() => PlainPassword.create('MotDePasseQuiGagne1')).toThrow(
      WeakPasswordError,
    );
  });

  it('accepte les majuscules et minuscules accentuées', () => {
    expect(() => PlainPassword.create('Éléphantéléphant1!')).not.toThrow();
  });

  it('ne révèle jamais sa valeur à la sérialisation', () => {
    const password = PlainPassword.create(VALID);

    expect(JSON.stringify({ password })).not.toContain(VALID);
    expect(password.toString()).not.toContain(VALID);
  });
});
