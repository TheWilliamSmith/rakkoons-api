import { TrivialSecretHasher } from '@test/identity/in-memory/trivial-secret-hasher';
import { PasswordResetAttemptsExhaustedError } from '../errors/password-reset-attempts-exhausted.error';
import { PasswordResetCodeRejectedError } from '../errors/password-reset-code-rejected.error';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import { VerificationJourney } from './verification-journey';
import { VerificationPurpose } from './verification-purpose';

const MINUTE = 60 * 1000;
const OPENED_AT = new Date('2026-01-01T10:00:00.000Z');
const CODE = '429861';
const MAX_ATTEMPTS = 5;

function open(): VerificationJourney {
  return VerificationJourney.open({
    id: 'reset-1',
    purpose: VerificationPurpose.PasswordReset,
    accountId: 'account-1',
    codeHash: PasswordHash.fromStoredValue(`hashed:${CODE}`),
    maxAttempts: MAX_ATTEMPTS,
    codeExpiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
    expiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
    openedAt: OPENED_AT,
  });
}

function at(minutes: number): Date {
  return new Date(OPENED_AT.getTime() + minutes * MINUTE);
}

describe('VerificationJourney en réinitialisation', () => {
  const hasher = new TrivialSecretHasher();

  it('marque le parcours vérifié sans le consommer', async () => {
    const journey = open();

    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));

    expect(journey.isVerified()).toBe(true);
    expect(journey.isConsumed()).toBe(false);
    expect(journey.attemptsLeft).toBe(MAX_ATTEMPTS - 1);
  });

  it('refuse un code faux avec l erreur propre à la réinitialisation', async () => {
    const journey = open();

    await expect(
      journey.verifyCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
    expect(journey.isVerified()).toBe(false);
  });

  it('refuse un code correct après expiration', async () => {
    const journey = open();

    await expect(
      journey.verifyCode(VerificationCode.create(CODE), hasher, at(16)),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('épuise le parcours à la cinquième tentative manquée', async () => {
    const journey = open();

    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      await expect(
        journey.verifyCode(VerificationCode.create('000000'), hasher, at(1)),
      ).rejects.toThrow(PasswordResetCodeRejectedError);
    }

    await expect(
      journey.verifyCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(PasswordResetAttemptsExhaustedError);
    expect(journey.isConsumed()).toBe(true);
  });

  it('refuse de consommer un parcours qui n a pas été vérifié', () => {
    const journey = open();

    expect(() => journey.consumeVerified(at(1))).toThrow(
      PasswordResetCodeRejectedError,
    );
  });

  it('consomme un parcours vérifié', async () => {
    const journey = open();
    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));

    journey.consumeVerified(at(2));

    expect(journey.isConsumed()).toBe(true);
    expect(journey.consumedAt).toEqual(at(2));
  });

  it('refuse une seconde consommation du même parcours', async () => {
    const journey = open();
    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));
    journey.consumeVerified(at(2));

    expect(() => journey.consumeVerified(at(3))).toThrow(
      PasswordResetCodeRejectedError,
    );
  });

  it('refuse de consommer un parcours vérifié mais expiré', async () => {
    const journey = open();
    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));

    expect(() => journey.consumeVerified(at(16))).toThrow(
      PasswordResetCodeRejectedError,
    );
  });

  it('refuse de vérifier deux fois un parcours déjà consommé', async () => {
    const journey = open();
    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));
    journey.consumeVerified(at(2));

    await expect(
      journey.verifyCode(VerificationCode.create(CODE), hasher, at(3)),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });
});
