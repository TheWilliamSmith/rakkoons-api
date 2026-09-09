import { InvalidVerificationCodeError } from '../errors/invalid-verification-code.error';
import { VerificationCode } from './verification-code';

describe('VerificationCode', () => {
  it('accepte un code de six chiffres', () => {
    expect(VerificationCode.create('429861').reveal()).toBe('429861');
  });

  it('refuse un code plus court que six chiffres', () => {
    expect(() => VerificationCode.create('42986')).toThrow(
      InvalidVerificationCodeError,
    );
  });

  it('refuse un code contenant une lettre', () => {
    expect(() => VerificationCode.create('42986a')).toThrow(
      InvalidVerificationCodeError,
    );
  });

  it('ne révèle jamais sa valeur à la sérialisation', () => {
    expect(
      JSON.stringify({ code: VerificationCode.create('429861') }),
    ).not.toContain('429861');
  });
});
