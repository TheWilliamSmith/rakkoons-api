import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
  TEST_SESSION_POLICY,
} from '@test/identity/identity-test-context';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';
import { Session } from '../domain/session/session';
import { PasswordHash } from '../domain/value-objects/password-hash';

const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';
const DAY = 24 * 60 * 60 * 1000;

describe('AuthenticateSessionUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function activateAccount(): Promise<void> {
    const registration = await context.registerAccount().execute({
      username: USERNAME,
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });
  }

  async function signIn(): Promise<string> {
    const session = await context
      .openSession()
      .execute({ email: EMAIL, password: TEST_PASSWORD });

    return session.sessionIdentifier;
  }

  it('rend l identité de l appelant et rien de plus', async () => {
    await activateAccount();
    const identifier = await signIn();

    const caller = await context
      .authenticateSession()
      .execute({ sessionIdentifier: identifier });

    expect(Object.keys(caller).sort()).toEqual(['accountId', 'username']);
    expect(caller.username).toBe(USERNAME);
    expect(typeof caller.accountId).toBe('string');
  });

  it('ne divulgue ni empreinte, ni adresse, ni identifiant de session', async () => {
    await activateAccount();
    const identifier = await signIn();

    const caller = await context
      .authenticateSession()
      .execute({ sessionIdentifier: identifier });
    const serialized = JSON.stringify(caller);

    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain(identifier);
    expect(serialized).not.toContain('hashed:');
  });

  it('refuse à l identique sans cookie, sur un identifiant inconnu, expiré ou révoqué', async () => {
    await activateAccount();
    const known = await signIn();
    const revoked = await signIn();

    await context.revokeSession().execute({ sessionIdentifier: revoked });

    const rejections = [
      context.authenticateSession().execute({ sessionIdentifier: null }),
      context
        .authenticateSession()
        .execute({ sessionIdentifier: 'jamais-emis' }),
      context.authenticateSession().execute({ sessionIdentifier: revoked }),
    ];

    for (const rejection of rejections) {
      await expect(rejection).rejects.toThrow(SessionNotEstablishedError);
    }

    context.clock.advanceBy(TEST_SESSION_POLICY.slidingLifetime);

    await expect(
      context.authenticateSession().execute({ sessionIdentifier: known }),
    ).rejects.toThrow(SessionNotEstablishedError);
  });

  it('repousse l échéance glissante à chaque usage', async () => {
    await activateAccount();
    const identifier = await signIn();

    context.clock.advanceBy(DAY);
    await context
      .authenticateSession()
      .execute({ sessionIdentifier: identifier });

    context.clock.advanceBy(TEST_SESSION_POLICY.slidingLifetime - DAY);

    await expect(
      context.authenticateSession().execute({ sessionIdentifier: identifier }),
    ).resolves.toBeDefined();
  });

  it('ne repousse jamais l échéance au delà de la durée absolue', async () => {
    await activateAccount();
    const identifier = await signIn();
    const step = 10 * DAY;
    const steps = TEST_SESSION_POLICY.absoluteLifetime / step - 1;

    for (let used = 0; used < steps; used += 1) {
      context.clock.advanceBy(step);
      await expect(
        context
          .authenticateSession()
          .execute({ sessionIdentifier: identifier }),
      ).resolves.toBeDefined();
    }

    context.clock.advanceBy(step);

    await expect(
      context.authenticateSession().execute({ sessionIdentifier: identifier }),
    ).rejects.toThrow(SessionNotEstablishedError);
  });

  it('refuse une session dont le compte n est pas actif', async () => {
    const registration = await context.registerAccount().execute({
      username: USERNAME,
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    const journey = await context.journeys.findById(registration.journeyId);

    await context.sessions.add(
      Session.open({
        id: 'session-en-attente',
        accountId: journey?.accountId ?? '',
        identifierHash: PasswordHash.fromStoredValue('hashed:jeton-test'),
        slidingLifetime: TEST_SESSION_POLICY.slidingLifetime,
        absoluteLifetime: TEST_SESSION_POLICY.absoluteLifetime,
        openedAt: context.clock.now(),
      }),
    );

    await expect(
      context
        .authenticateSession()
        .execute({ sessionIdentifier: 'jeton-test' }),
    ).rejects.toThrow(SessionNotEstablishedError);
  });
});
