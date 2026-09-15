import { TrivialSecretHasher } from '@test/identity/in-memory/trivial-secret-hasher';
import { VerificationCodeRejectedError } from '../errors/verification-code-rejected.error';
import { PasswordHash } from '../value-objects/password-hash';
import { VerificationCode } from '../value-objects/verification-code';
import { VerificationJourney } from './verification-journey';
import { VerificationPurpose } from './verification-purpose';

const MINUTE = 60 * 1000;
const OPENED_AT = new Date('2026-01-01T10:00:00.000Z');
const CODE = '429861';
const NEXT_CODE = '703152';
const MAX_ATTEMPTS = 5;
const CODE_LIFETIME = 10 * MINUTE;

function open(): VerificationJourney {
  return VerificationJourney.open({
    id: 'journey-1',
    purpose: VerificationPurpose.SignUp,
    accountId: 'account-1',
    codeHash: PasswordHash.fromStoredValue(`hashed:${CODE}`),
    maxAttempts: MAX_ATTEMPTS,
    codeExpiresAt: new Date(OPENED_AT.getTime() + CODE_LIFETIME),
    expiresAt: new Date(OPENED_AT.getTime() + 15 * MINUTE),
    openedAt: OPENED_AT,
  });
}

function at(minutes: number): Date {
  return new Date(OPENED_AT.getTime() + minutes * MINUTE);
}

function renew(journey: VerificationJourney, renewedAt: Date): void {
  journey.renewCode(
    PasswordHash.fromStoredValue(`hashed:${NEXT_CODE}`),
    new Date(renewedAt.getTime() + CODE_LIFETIME),
    renewedAt,
  );
}

describe('VerificationJourney.renewCode', () => {
  const hasher = new TrivialSecretHasher();

  it('remplace le code sans toucher à la fenêtre du parcours', async () => {
    const journey = open();

    renew(journey, at(11));

    expect(journey.expiresAt).toEqual(at(15));
    expect(journey.codeExpiresAt).toEqual(at(21));
    await expect(
      journey.submitCode(VerificationCode.create(NEXT_CODE), hasher, at(12)),
    ).resolves.toBeUndefined();
  });

  it('refuse le code précédent après un renvoi', async () => {
    const journey = open();

    renew(journey, at(1));

    await expect(
      journey.submitCode(VerificationCode.create(CODE), hasher, at(2)),
    ).rejects.toThrow(VerificationCodeRejectedError);
  });

  it('ranime un code expiré tant que le parcours est ouvert', async () => {
    const journey = open();

    renew(journey, at(12));

    await expect(
      journey.submitCode(VerificationCode.create(NEXT_CODE), hasher, at(13)),
    ).resolves.toBeUndefined();
  });

  it('ne rend pas de tentative', async () => {
    const journey = open();
    await expect(
      journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
    ).rejects.toThrow(VerificationCodeRejectedError);

    renew(journey, at(2));

    expect(journey.attemptsLeft).toBe(MAX_ATTEMPTS - 1);
  });

  it('refuse un renvoi quand le parcours est expiré', () => {
    const journey = open();

    expect(() => renew(journey, at(15))).toThrow(VerificationCodeRejectedError);
  });

  it('refuse un renvoi quand le parcours est consommé', async () => {
    const journey = open();
    await journey.submitCode(VerificationCode.create(CODE), hasher, at(1));

    expect(() => renew(journey, at(2))).toThrow(VerificationCodeRejectedError);
  });

  it('refuse un renvoi quand le code a déjà été vérifié', async () => {
    const journey = open();
    await journey.verifyCode(VerificationCode.create(CODE), hasher, at(1));

    expect(() => renew(journey, at(2))).toThrow(VerificationCodeRejectedError);
  });

  it('refuse un renvoi quand les tentatives sont épuisées', async () => {
    const journey = open();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await expect(
        journey.submitCode(VerificationCode.create('000000'), hasher, at(1)),
      ).rejects.toThrow();
    }

    expect(() => renew(journey, at(2))).toThrow(VerificationCodeRejectedError);
  });
});
