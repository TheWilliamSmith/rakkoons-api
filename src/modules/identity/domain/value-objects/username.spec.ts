import { InvalidUsernameError } from '../errors/invalid-username.error';
import { Username } from './username';

describe('Username', () => {
  it('normalise la casse et les espaces de bord', () => {
    expect(Username.create(' Rakkoonette ').toString()).toBe('rakkoonette');
  });

  it('accepte les tirets et les soulignés en position intérieure', () => {
    expect(Username.create('rak_koon-ette').toString()).toBe('rak_koon-ette');
  });

  it('refuse un nom plus court que trois caractères', () => {
    expect(() => Username.create('ra')).toThrow(InvalidUsernameError);
  });

  it('refuse un nom plus long que vingt caractères', () => {
    expect(() => Username.create('r'.repeat(21))).toThrow(InvalidUsernameError);
  });

  it('refuse un nom commençant par un séparateur', () => {
    expect(() => Username.create('-rakkoon')).toThrow(InvalidUsernameError);
  });

  it('refuse un nom finissant par un séparateur', () => {
    expect(() => Username.create('rakkoon_')).toThrow(InvalidUsernameError);
  });

  it('refuse un nom contenant un caractère interdit', () => {
    expect(() => Username.create('rakkoon!')).toThrow(InvalidUsernameError);
  });
});
