import { TrivialSecretHasher } from '@test/identity/in-memory/trivial-secret-hasher';
import { SignInAttemptsExhaustedError } from '../errors/sign-in-attempts-exhausted.error';
import { SignInCodeRejectedError } from '../errors/sign-in-code-rejected.error';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import { VerificationJourney } from './verification-journey';
import { VerificationPurpose } from './verification-purpose';

const MINUTE = 60 * 1000;
const OPENED_AT = new Date('2026-01-01T10:00:00.000Z');
const CODE = '429861';
const MAX_ATTEMPTS = 5;

function open(codeHash = `hashed:${CODE}`): VerificationJourney {
  return VerificationJourney.open({
    id: 'sign-in-1',
    purpose: VerificationPurpose.SignIn,
    accountId: 'account-1',
    codeHash: PasswordHash.fromStoredValue(codeHash),
    maxAttempts: MAX_ATTEMPTS,
    codeExpiresAt: new Date(OPENED_AT.getTime() + 10 * MINUTE),
    expiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
    openedAt: OPENED_AT,
  });
}

function at(minutes: number): Date {
  return new Date(OPENED_AT.getTime() + minutes * MINUTE);
}

describe('VerificationJourney en connexion', () => {
  const hasher = new TrivialSecretHasher();

  it('consomme le parcours quand le code est correct', async () => {
    const journey = open();

    await journey.submitCode(VerificationCode.create(CODE), hasher, at(1));

    expect(journey.isConsumed()).toBe(true);
  });

  it('refuse un code faux avec l erreur propre à la connexion', async () => {
    const journey = open();

    await expect(
      journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(SignInCodeRejectedError);
    expect(journey.attemptsLeft).toBe(MAX_ATTEMPTS - 1);
  });

  it('refuse un code correct après expiration du code', async () => {
    const journey = open();

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(11)),
    ).rejects.toThrow(SignInCodeRejectedError);
  });

  it('invalide le parcours à la cinquième tentative manquée', async () => {
    const journey = open();

    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      await expect(
        journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
      ).rejects.toThrow(SignInCodeRejectedError);
    }

    await expect(
      journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(SignInAttemptsExhaustedError);
    expect(journey.isConsumed()).toBe(true);
  });

  it('refuse tout code à six chiffres sur un parcours ouvert pour une adresse inconnue', async () => {
    const journey = open('hashed:un-secret-opaque-sans-forme-de-code');

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(1)),
    ).rejects.toThrow(SignInCodeRejectedError);
  });

  it('refuse une seconde soumission sur un parcours déjà consommé', async () => {
    const journey = open();
    await journey.submitCode(VerificationCode.create(CODE), hasher, at(1));

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(2)),
    ).rejects.toThrow(SignInCodeRejectedError);
  });
});
