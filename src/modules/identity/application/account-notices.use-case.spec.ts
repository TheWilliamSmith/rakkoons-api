import {
  IdentityTestContext,
  TEST_CODE,
  TEST_NEW_PASSWORD,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';

const EMAIL = 'william@rakkoons.fr';
const USERNAME = 'rakkoonette';

describe('avis envoyés après une action du compte', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function register(): Promise<string> {
    const registration = await context.registerAccount().execute({
      username: USERNAME,
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });

    return registration.journeyId;
  }

  async function activate(): Promise<string> {
    const journeyId = await register();
    await context.confirmRegistration().execute({ journeyId, code: TEST_CODE });

    const journey = await context.journeys.findById(journeyId);

    return journey?.accountId ?? '';
  }

  async function currentSessionId(): Promise<string> {
    const opened = await context
      .openSession()
      .execute({ email: EMAIL, password: TEST_PASSWORD });
    const caller = await context
      .authenticateSession()
      .execute({ sessionIdentifier: opened.sessionIdentifier });

    return caller.sessionId;
  }

  it('confirme l inscription une fois le compte activé', async () => {
    await activate();

    expect(context.messages.registrationConfirmations).toEqual([
      { recipient: EMAIL, username: USERNAME },
    ]);
  });

  it('n annonce rien tant que le compte n est pas activé', async () => {
    await register();

    expect(context.messages.registrationConfirmations).toHaveLength(0);
  });

  it('confirme un changement de mot de passe', async () => {
    const accountId = await activate();
    const sessionId = await currentSessionId();

    await context.changePassword().execute({
      accountId,
      currentSessionId: sessionId,
      currentPassword: TEST_PASSWORD,
      newPassword: TEST_NEW_PASSWORD,
    });

    expect(context.messages.passwordChanges).toEqual([EMAIL]);
  });

  it('n annonce rien quand le mot de passe actuel est refusé', async () => {
    const accountId = await activate();
    const sessionId = await currentSessionId();

    await context
      .changePassword()
      .execute({
        accountId,
        currentSessionId: sessionId,
        currentPassword: 'MauvaisMotDePasse1!',
        newPassword: TEST_NEW_PASSWORD,
      })
      .catch(() => undefined);

    expect(context.messages.passwordChanges).toHaveLength(0);
  });

  it('confirme une réinitialisation de mot de passe', async () => {
    await activate();
    const reset = await context
      .requestPasswordReset()
      .execute({ email: EMAIL });
    await context
      .verifyPasswordResetCode()
      .execute({ journeyId: reset.journeyId, code: TEST_CODE });

    await context
      .confirmPasswordReset()
      .execute({ journeyId: reset.journeyId, password: TEST_NEW_PASSWORD });

    expect(context.messages.passwordResetCompletions).toEqual([EMAIL]);
  });

  it('confirme un changement de nom d utilisateur', async () => {
    const accountId = await activate();

    await context
      .changeUsername()
      .execute({ accountId, username: 'rakkoonette2' });

    expect(context.messages.usernameChanges).toEqual([
      { recipient: EMAIL, username: 'rakkoonette2' },
    ]);
  });

  it('n annonce rien quand le nom soumis est déjà le nom actuel', async () => {
    const accountId = await activate();

    await context.changeUsername().execute({ accountId, username: USERNAME });

    expect(context.messages.usernameChanges).toHaveLength(0);
  });

  it('confirme l annulation d une suppression', async () => {
    const accountId = await activate();
    await context
      .scheduleAccountDeletion()
      .execute({ accountId, currentPassword: TEST_PASSWORD });

    await context.cancelAccountDeletion().execute({ accountId });

    expect(context.messages.deletionCancellations).toEqual([EMAIL]);
  });

  it('laisse l action réussir quand l avis ne part pas', async () => {
    const accountId = await activate();
    const sessionId = await currentSessionId();
    context.messages.sendPasswordChanged = (): Promise<void> =>
      Promise.reject(new Error('smtp down'));

    await expect(
      context.changePassword().execute({
        accountId,
        currentSessionId: sessionId,
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      }),
    ).resolves.toBeUndefined();

    await expect(
      context
        .openSession()
        .execute({ email: EMAIL, password: TEST_NEW_PASSWORD }),
    ).resolves.toBeDefined();
  });
});
