import { VerificationAttemptsExhaustedError } from '../errors/verification-attempts-exhausted.error';
import { VerificationCodeRejectedError } from '../errors/verification-code-rejected.error';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import { TrivialSecretHasher } from '@test/identity/in-memory/trivial-secret-hasher';
import { VerificationJourney } from './verification-journey';
import { VerificationPurpose } from './verification-purpose';

const MINUTE = 60 * 1000;
const OPENED_AT = new Date('2026-01-01T10:00:00.000Z');
const CODE = '429861';
const MAX_ATTEMPTS = 5;

function open(): VerificationJourney {
  return VerificationJourney.open({
    id: 'journey-1',
    purpose: VerificationPurpose.SignUp,
    accountId: 'account-1',
    codeHash: PasswordHash.fromStoredValue(`hashed:${CODE}`),
    maxAttempts: MAX_ATTEMPTS,
    codeExpiresAt: new Date(OPENED_AT.getTime() + 10 * MINUTE),
    expiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
    openedAt: OPENED_AT,
  });
}

function at(minutes: number): Date {
  return new Date(OPENED_AT.getTime() + minutes * MINUTE);
}

describe('VerificationJourney', () => {
  const hasher = new TrivialSecretHasher();

  it('consomme le parcours quand le code est correct', async () => {
    const journey = open();

    await journey.submitCode(VerificationCode.create(CODE), hasher, at(1));

    expect(journey.isConsumed()).toBe(true);
    expect(journey.attemptsLeft).toBe(MAX_ATTEMPTS - 1);
  });

  it('refuse un code faux et décompte une tentative', async () => {
    const journey = open();

    await expect(
      journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(VerificationCodeRejectedError);
    expect(journey.attemptsLeft).toBe(MAX_ATTEMPTS - 1);
    expect(journey.isConsumed()).toBe(false);
  });

  it('refuse un code correct après expiration du code', async () => {
    const journey = open();

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(11)),
    ).rejects.toThrow(VerificationCodeRejectedError);
    expect(journey.isConsumed()).toBe(false);
  });

  it('refuse un code correct après expiration du parcours', async () => {
    const journey = open();

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(16)),
    ).rejects.toThrow(VerificationCodeRejectedError);
  });

  it('invalide le parcours à la cinquième tentative manquée', async () => {
    const journey = open();

    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      await expect(
        journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
      ).rejects.toThrow(VerificationCodeRejectedError);
    }

    await expect(
      journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(VerificationAttemptsExhaustedError);
    expect(journey.attemptsLeft).toBe(0);
    expect(journey.isConsumed()).toBe(true);
  });

  it('refuse toute soumission sur un parcours épuisé', async () => {
    const journey = open();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await journey
        .submitCode(VerificationCode.create('000000'), hasher, at(1))
        .catch(() => undefined);
    }

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(2)),
    ).rejects.toThrow(VerificationCodeRejectedError);
  });

  it('refuse une seconde soumission sur un parcours déjà consommé', async () => {
    const journey = open();
    await journey.submitCode(VerificationCode.create(CODE), hasher, at(1));

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(2)),
    ).rejects.toThrow(VerificationCodeRejectedError);
  });

  it('refuse tous les codes sur un parcours sans compte associé', async () => {
    const journey = VerificationJourney.open({
      id: 'journey-2',
      purpose: VerificationPurpose.SignUp,
      accountId: null,
      codeHash: PasswordHash.fromStoredValue('hashed:unmatched-secret'),
      maxAttempts: MAX_ATTEMPTS,
      codeExpiresAt: new Date(OPENED_AT.getTime() + 10 * MINUTE),
      expiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
      openedAt: OPENED_AT,
    });

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(1)),
    ).rejects.toThrow(VerificationCodeRejectedError);
  });
});
