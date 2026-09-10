import { randomUUID } from 'node:crypto';
import { Account } from '@identity/domain/account/account';
import { AccountStatus } from '@identity/domain/account/account-status';
import { EmailAlreadyRegisteredError } from '@identity/domain/errors/email-already-registered.error';
import { UsernameAlreadyTakenError } from '@identity/domain/errors/username-already-taken.error';
import { Session } from '@identity/domain/session/session';
import { EmailAddress } from '@identity/domain/value-objects/email-address';
import { PasswordHash } from '@identity/domain/value-objects/password-hash';
import { Username } from '@identity/domain/value-objects/username';
import { VerificationCode } from '@identity/domain/value-objects/verification-code';
import { VerificationJourney } from '@identity/domain/verification/verification-journey';
import { VerificationPurpose } from '@identity/domain/verification/verification-purpose';
import { TrivialSecretHasher } from './in-memory/trivial-secret-hasher';
import { PrismaIdentityHarness } from './prisma-identity-harness';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const REGISTERED_AT = new Date('2026-01-01T10:00:00.000Z');

function openJourney(
  accountId: string | null,
  purpose: VerificationPurpose,
  codeHash = 'digest',
): VerificationJourney {
  return VerificationJourney.open({
    id: randomUUID(),
    purpose,
    accountId,
    codeHash: PasswordHash.fromStoredValue(codeHash),
    maxAttempts: 5,
    codeExpiresAt: new Date(REGISTERED_AT.getTime() + 10 * MINUTE),
    expiresAt: new Date(REGISTERED_AT.getTime() + 15 * MINUTE),
    openedAt: REGISTERED_AT,
  });
}

function buildAccount(username: string, email: string): Account {
  return Account.register({
    id: randomUUID(),
    username: Username.create(username),
    email: EmailAddress.create(email),
    passwordHash: PasswordHash.fromStoredValue('$argon2id$stub'),
    hasAcceptedTerms: true,
    termsVersion: '2026-01',
    registeredAt: REGISTERED_AT,
  });
}

describe('Dépôts Prisma du module identité', () => {
  const harness = new PrismaIdentityHarness();

  beforeAll(async () => {
    await harness.start();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.reset();
    await harness.stop();
  });

  it('écrit puis relit un compte à l identique', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    const reloaded = await harness.accounts.findById(account.id);

    expect(reloaded?.id).toBe(account.id);
    expect(reloaded?.username.toString()).toBe('rakkoonette');
    expect(reloaded?.email.toString()).toBe('william@rakkoons.fr');
    expect(reloaded?.passwordHash.toString()).toBe('$argon2id$stub');
    expect(reloaded?.status).toBe(AccountStatus.Pending);
    expect(reloaded?.termsVersion).toBe('2026-01');
    expect(reloaded?.termsAcceptedAt).toEqual(REGISTERED_AT);
  });

  it('retrouve un compte par son adresse quelle que soit la casse', async () => {
    await harness.accounts.add(
      buildAccount('rakkoonette', 'william@rakkoons.fr'),
    );

    const found = await harness.accounts.findByEmail(
      EmailAddress.create('WILLIAM@RAKKOONS.FR'),
    );

    expect(found).not.toBeNull();
  });

  it('persiste l activation d un compte', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    const activatedAt = new Date('2026-01-01T10:05:00.000Z');
    account.activate(activatedAt);
    await harness.accounts.save(account);

    const reloaded = await harness.accounts.findById(account.id);

    expect(reloaded?.status).toBe(AccountStatus.Active);
    expect(reloaded?.updatedAt).toEqual(activatedAt);
  });

  it('rejette un nom déjà pris avec une casse différente', async () => {
    await harness.accounts.add(
      buildAccount('rakkoonette', 'william@rakkoons.fr'),
    );

    await expect(
      harness.accounts.add(buildAccount('RakkoonEtte', 'autre@rakkoons.fr')),
    ).rejects.toThrow(UsernameAlreadyTakenError);
  });

  it('rejette une adresse déjà enregistrée avec une casse différente', async () => {
    await harness.accounts.add(
      buildAccount('rakkoonette', 'william@rakkoons.fr'),
    );

    await expect(
      harness.accounts.add(buildAccount('autrekoon', 'William@Rakkoons.FR')),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('ne crée qu un seul compte quand deux inscriptions concurrentes portent le même nom', async () => {
    const results = await Promise.allSettled([
      harness.accounts.add(buildAccount('rakkoonette', 'un@rakkoons.fr')),
      harness.accounts.add(buildAccount('rakkoonette', 'deux@rakkoons.fr')),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(await harness.prisma.account.count()).toBe(1);
    expect(
      results.find((result) => result.status === 'rejected')?.reason,
    ).toBeInstanceOf(UsernameAlreadyTakenError);
  });

  it('écrit puis relit un parcours de vérification à l identique', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    const journey = VerificationJourney.open({
      id: randomUUID(),
      purpose: VerificationPurpose.SignUp,
      accountId: account.id,
      codeHash: PasswordHash.fromStoredValue('digest'),
      maxAttempts: 5,
      codeExpiresAt: new Date(REGISTERED_AT.getTime() + 10 * MINUTE),
      expiresAt: new Date(REGISTERED_AT.getTime() + 15 * MINUTE),
      openedAt: REGISTERED_AT,
    });
    await harness.journeys.add(journey);

    const reloaded = await harness.journeys.findById(journey.id);

    expect(reloaded?.accountId).toBe(account.id);
    expect(reloaded?.purpose).toBe(VerificationPurpose.SignUp);
    expect(reloaded?.attemptsLeft).toBe(5);
    expect(reloaded?.codeHash.toString()).toBe('digest');
    expect(reloaded?.expiresAt).toEqual(journey.expiresAt);
    expect(reloaded?.isConsumed()).toBe(false);
  });

  it('accepte un parcours sans compte associé', async () => {
    const journey = VerificationJourney.open({
      id: randomUUID(),
      purpose: VerificationPurpose.SignUp,
      accountId: null,
      codeHash: PasswordHash.fromStoredValue('digest'),
      maxAttempts: 5,
      codeExpiresAt: new Date(REGISTERED_AT.getTime() + 10 * MINUTE),
      expiresAt: new Date(REGISTERED_AT.getTime() + 15 * MINUTE),
      openedAt: REGISTERED_AT,
    });
    await harness.journeys.add(journey);

    expect((await harness.journeys.findById(journey.id))?.accountId).toBeNull();
  });

  it('persiste la vérification d un code sans consommer le parcours', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    const journey = openJourney(
      account.id,
      VerificationPurpose.PasswordReset,
      'hashed:429861',
    );
    await harness.journeys.add(journey);

    await journey.verifyCode(
      VerificationCode.create('429861'),
      new TrivialSecretHasher(),
      new Date(REGISTERED_AT.getTime() + MINUTE),
    );
    await harness.journeys.save(journey);

    const reloaded = await harness.journeys.findById(journey.id);

    expect(reloaded?.isVerified()).toBe(true);
    expect(reloaded?.isConsumed()).toBe(false);
    expect(reloaded?.verifiedAt).toEqual(journey.verifiedAt);
  });

  it('consomme les parcours de réinitialisation en cours du seul compte visé', async () => {
    const owner = buildAccount('rakkoonette', 'william@rakkoons.fr');
    const other = buildAccount('autrekoon', 'autre@rakkoons.fr');
    await harness.accounts.add(owner);
    await harness.accounts.add(other);

    const reset = openJourney(owner.id, VerificationPurpose.PasswordReset);
    const signUp = openJourney(owner.id, VerificationPurpose.SignUp);
    const foreign = openJourney(other.id, VerificationPurpose.PasswordReset);

    for (const journey of [reset, signUp, foreign]) {
      await harness.journeys.add(journey);
    }

    const consumedAt = new Date(REGISTERED_AT.getTime() + MINUTE);
    await harness.journeys.consumeActiveForAccount(
      owner.id,
      VerificationPurpose.PasswordReset,
      consumedAt,
    );

    expect((await harness.journeys.findById(reset.id))?.isConsumed()).toBe(
      true,
    );
    expect((await harness.journeys.findById(signUp.id))?.isConsumed()).toBe(
      false,
    );
    expect((await harness.journeys.findById(foreign.id))?.isConsumed()).toBe(
      false,
    );
  });

  it('écrit puis relit une session à l identique', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    const session = Session.open({
      id: randomUUID(),
      accountId: account.id,
      identifierHash: PasswordHash.fromStoredValue('session-digest'),
      slidingLifetime: 14 * DAY,
      absoluteLifetime: 60 * DAY,
      openedAt: REGISTERED_AT,
    });
    await harness.sessions.add(session);

    const reloaded =
      await harness.sessions.findByIdentifierHash('session-digest');

    expect(reloaded?.id).toBe(session.id);
    expect(reloaded?.accountId).toBe(account.id);
    expect(reloaded?.expiresAt).toEqual(session.expiresAt);
    expect(reloaded?.absoluteExpiresAt).toEqual(session.absoluteExpiresAt);
    expect(reloaded?.isUsableAt(REGISTERED_AT)).toBe(true);
  });

  it('révoque toutes les sessions d un compte', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');
    await harness.accounts.add(account);

    for (const digest of ['digest-1', 'digest-2']) {
      await harness.sessions.add(
        Session.open({
          id: randomUUID(),
          accountId: account.id,
          identifierHash: PasswordHash.fromStoredValue(digest),
          slidingLifetime: 14 * DAY,
          absoluteLifetime: 60 * DAY,
          openedAt: REGISTERED_AT,
        }),
      );
    }

    await harness.sessions.revokeAllForAccount(account.id, REGISTERED_AT);

    const revoked = await harness.sessions.findByIdentifierHash('digest-1');
    expect(revoked?.isUsableAt(REGISTERED_AT)).toBe(false);
  });

  it('annule l écriture des deux agrégats quand la transaction échoue', async () => {
    const account = buildAccount('rakkoonette', 'william@rakkoons.fr');

    await expect(
      harness.unitOfWork.run(async () => {
        await harness.accounts.add(account);
        throw new Error('interruption');
      }),
    ).rejects.toThrow('interruption');

    expect(await harness.prisma.account.count()).toBe(0);
  });
});
