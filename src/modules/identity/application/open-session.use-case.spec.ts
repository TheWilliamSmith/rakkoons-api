import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
  TEST_SESSION_POLICY,
} from '@test/identity/identity-test-context';
import { CredentialsRejectedError } from '../domain/errors/credentials-rejected.error';

const VALID_INPUT = {
  username: 'rakkoonette',
  email: 'william@rakkoons.fr',
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('OpenSessionUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function registerActiveAccount(): Promise<void> {
    const { journeyId } = await context.registerAccount().execute(VALID_INPUT);
    await context.confirmRegistration().execute({ journeyId, code: TEST_CODE });
  }

  async function failureOf(email: string, password: string): Promise<unknown> {
    return context
      .openSession()
      .execute({ email, password })
      .then(() => null)
      .catch((error: unknown) => error);
  }

  it('crée une session pour des identifiants valides', async () => {
    await registerActiveAccount();

    const output = await context
      .openSession()
      .execute({ email: VALID_INPUT.email, password: TEST_PASSWORD });

    expect(context.sessions.count()).toBe(1);
    expect(output.sessionIdentifier).toEqual(expect.any(String));
    expect(output.expiresAt.getTime()).toBe(
      context.clock.now().getTime() + TEST_SESSION_POLICY.slidingLifetime,
    );
  });

  it('ne stocke jamais l identifiant de session en clair', async () => {
    await registerActiveAccount();

    const output = await context
      .openSession()
      .execute({ email: VALID_INPUT.email, password: TEST_PASSWORD });
    const stored = await context.sessions.findByIdentifierHash(
      `hashed:${output.sessionIdentifier}`,
    );

    expect(stored).not.toBeNull();
    expect(stored?.identifierHash.toString()).not.toBe(
      output.sessionIdentifier,
    );
  });

  it('produit la même erreur pour une adresse inconnue, un mot de passe faux et un compte en attente', async () => {
    await context.registerAccount().execute(VALID_INPUT);
    await context.registerAccount().execute({
      ...VALID_INPUT,
      username: 'activekoon',
      email: 'active@rakkoons.fr',
    });

    const unknownAddress = await failureOf(
      'inconnu@rakkoons.fr',
      TEST_PASSWORD,
    );
    const wrongPassword = await failureOf(
      VALID_INPUT.email,
      'MauvaisMotDePasse1',
    );
    const pendingAccount = await failureOf(VALID_INPUT.email, TEST_PASSWORD);

    expect(unknownAddress).toBeInstanceOf(CredentialsRejectedError);
    expect(wrongPassword).toBeInstanceOf(CredentialsRejectedError);
    expect(pendingAccount).toBeInstanceOf(CredentialsRejectedError);
    expect(context.sessions.count()).toBe(0);
  });

  it('hache un mot de passe factice quand l adresse est inconnue', async () => {
    await failureOf('inconnu@rakkoons.fr', TEST_PASSWORD);

    expect(context.passwordHasher.decoyVerifications).toBe(1);
  });

  it('refuse une adresse ou un mot de passe malformés sans distinction', async () => {
    const malformedEmail = await failureOf('pas-une-adresse', TEST_PASSWORD);
    const shortPassword = await failureOf(VALID_INPUT.email, 'court');

    expect(malformedEmail).toBeInstanceOf(CredentialsRejectedError);
    expect(shortPassword).toBeInstanceOf(CredentialsRejectedError);
  });
});
