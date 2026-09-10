import {
  IdentityTestContext,
  TEST_CODE,
  TEST_NEW_PASSWORD,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { CredentialsRejectedError } from '../domain/errors/credentials-rejected.error';
import { PasswordResetCodeRejectedError } from '../domain/errors/password-reset-code-rejected.error';
import { WeakPasswordError } from '../domain/errors/weak-password.error';

const EMAIL = 'william@rakkoons.fr';

describe('ConfirmPasswordResetUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function activateAccount(): Promise<string> {
    const registration = await context.registerAccount().execute({
      username: 'rakkoonette',
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });

    const journey = await context.journeys.findById(registration.journeyId);

    return journey?.accountId ?? '';
  }

  async function verifiedReset(): Promise<string> {
    const reset = await context.requestPasswordReset().execute({
      email: EMAIL,
    });
    await context
      .verifyPasswordResetCode()
      .execute({ journeyId: reset.journeyId, code: TEST_CODE });

    return reset.journeyId;
  }

  it('pose le nouveau mot de passe, consomme le parcours et coupe les sessions', async () => {
    const accountId = await activateAccount();
    await context
      .openSession()
      .execute({ email: EMAIL, password: TEST_PASSWORD });
    const journeyId = await verifiedReset();

    await context
      .confirmPasswordReset()
      .execute({ journeyId, password: TEST_NEW_PASSWORD });

    const account = await context.accounts.findById(accountId);

    expect(account?.passwordHash.toString()).toBe(
      `hashed:${TEST_NEW_PASSWORD}`,
    );
    expect((await context.journeys.findById(journeyId))?.isConsumed()).toBe(
      true,
    );
    await expect(
      context.openSession().execute({ email: EMAIL, password: TEST_PASSWORD }),
    ).rejects.toThrow(CredentialsRejectedError);
  });

  it('n ouvre aucune session en posant le mot de passe', async () => {
    await activateAccount();
    const journeyId = await verifiedReset();

    await context
      .confirmPasswordReset()
      .execute({ journeyId, password: TEST_NEW_PASSWORD });

    expect(context.sessions.count()).toBe(0);
  });

  it('laisse ouvrir une session avec le nouveau mot de passe', async () => {
    await activateAccount();
    const journeyId = await verifiedReset();

    await context
      .confirmPasswordReset()
      .execute({ journeyId, password: TEST_NEW_PASSWORD });

    await expect(
      context
        .openSession()
        .execute({ email: EMAIL, password: TEST_NEW_PASSWORD }),
    ).resolves.toBeDefined();
  });

  it('refuse un parcours dont le code n a jamais été vérifié', async () => {
    await activateAccount();
    const reset = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    await expect(
      context
        .confirmPasswordReset()
        .execute({ journeyId: reset.journeyId, password: TEST_NEW_PASSWORD }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse à l identique quand le cookie de parcours manque', async () => {
    await activateAccount();
    await verifiedReset();

    await expect(
      context
        .confirmPasswordReset()
        .execute({ journeyId: null, password: TEST_NEW_PASSWORD }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse un second usage du même parcours', async () => {
    await activateAccount();
    const journeyId = await verifiedReset();
    await context
      .confirmPasswordReset()
      .execute({ journeyId, password: TEST_NEW_PASSWORD });

    await expect(
      context
        .confirmPasswordReset()
        .execute({ journeyId, password: 'EncoreUnAutre3!' }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse un mot de passe qui ne respecte pas la politique et garde le parcours utilisable', async () => {
    await activateAccount();
    const journeyId = await verifiedReset();

    await expect(
      context
        .confirmPasswordReset()
        .execute({ journeyId, password: 'sanschiffre' }),
    ).rejects.toThrow(WeakPasswordError);

    expect((await context.journeys.findById(journeyId))?.isConsumed()).toBe(
      false,
    );
  });
});
