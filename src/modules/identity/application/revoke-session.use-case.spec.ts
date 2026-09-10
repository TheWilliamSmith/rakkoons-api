import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { SessionNotEstablishedError } from '../domain/errors/session-not-established.error';

const EMAIL = 'william@rakkoons.fr';

describe('RevokeSessionUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function signedInIdentifier(): Promise<string> {
    const registration = await context.registerAccount().execute({
      username: 'rakkoonette',
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });

    const session = await context
      .openSession()
      .execute({ email: EMAIL, password: TEST_PASSWORD });

    return session.sessionIdentifier;
  }

  it('révoque la session, qui n authentifie plus personne', async () => {
    const identifier = await signedInIdentifier();

    await context.revokeSession().execute({ sessionIdentifier: identifier });

    await expect(
      context.authenticateSession().execute({ sessionIdentifier: identifier }),
    ).rejects.toThrow(SessionNotEstablishedError);
  });

  it('laisse la session en base plutôt que de l oublier', async () => {
    const identifier = await signedInIdentifier();

    await context.revokeSession().execute({ sessionIdentifier: identifier });

    expect(context.sessions.count()).toBe(1);
  });

  it('n échoue pas sans cookie', async () => {
    await expect(
      context.revokeSession().execute({ sessionIdentifier: null }),
    ).resolves.toBeUndefined();
  });

  it('n échoue pas sur un identifiant inconnu', async () => {
    await expect(
      context.revokeSession().execute({ sessionIdentifier: 'jamais-emis' }),
    ).resolves.toBeUndefined();
  });

  it('n échoue pas sur une session déjà révoquée', async () => {
    const identifier = await signedInIdentifier();
    await context.revokeSession().execute({ sessionIdentifier: identifier });

    await expect(
      context.revokeSession().execute({ sessionIdentifier: identifier }),
    ).resolves.toBeUndefined();
  });

  it('ne touche pas aux autres sessions du compte', async () => {
    const first = await signedInIdentifier();
    const second = await context
      .openSession()
      .execute({ email: EMAIL, password: TEST_PASSWORD });

    await context.revokeSession().execute({ sessionIdentifier: first });

    await expect(
      context
        .authenticateSession()
        .execute({ sessionIdentifier: second.sessionIdentifier }),
    ).resolves.toBeDefined();
  });
});
