import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { AccountStatus } from '../domain/account/account-status';
import { SignInAttemptsExhaustedError } from '../domain/errors/sign-in-attempts-exhausted.error';
import { SignInCodeRejectedError } from '../domain/errors/sign-in-code-rejected.error';
import { VerificationJourneyNotFoundError } from '../domain/errors/verification-journey-not-found.error';
import { VerificationPurpose } from '../domain/verification/verification-purpose';

const EMAIL = 'william@rakkoons.fr';
const ORIGIN = '203.0.113.7';

const SIGN_UP_INPUT = {
  username: 'rakkoonette',
  email: EMAIL,
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('VerifySignInCodeUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function registerAccount(): Promise<string> {
    const registration = await context.registerAccount().execute(SIGN_UP_INPUT);
    const journey = await context.journeys.findById(registration.journeyId);

    return journey?.accountId ?? '';
  }

  async function activateAccount(): Promise<string> {
    const accountId = await registerAccount();
    const journey = await context.journeys.findActiveForAccount(
      accountId,
      VerificationPurpose.SignUp,
    );
    await context
      .confirmRegistration()
      .execute({ journeyId: journey?.id ?? '', code: TEST_CODE });

    return accountId;
  }

  async function requestCode(email = EMAIL): Promise<string> {
    const output = await context
      .requestSignInCode()
      .execute({ email, origin: ORIGIN });

    return output.journeyId;
  }

  it('ouvre une session quand le code est correct', async () => {
    await activateAccount();
    const journeyId = await requestCode();

    const session = await context
      .verifySignInCode()
      .execute({ journeyId, code: TEST_CODE });

    expect(typeof session.sessionIdentifier).toBe('string');
    expect(context.sessions.count()).toBe(1);
    expect((await context.journeys.findById(journeyId))?.isConsumed()).toBe(
      true,
    );
  });

  it('active un compte en attente puis ouvre une session', async () => {
    const accountId = await registerAccount();
    const journeyId = await requestCode();

    await context.verifySignInCode().execute({ journeyId, code: TEST_CODE });

    expect((await context.accounts.findById(accountId))?.status).toBe(
      AccountStatus.Active,
    );
    expect(context.sessions.count()).toBe(1);
  });

  it('échoue comme un code faux sur un parcours ouvert pour une adresse inconnue', async () => {
    const journeyId = await requestCode('inconnu@rakkoons.fr');

    await expect(
      context.verifySignInCode().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
    expect(context.sessions.count()).toBe(0);
  });

  it('refuse à l identique quand le cookie de parcours manque', async () => {
    await activateAccount();
    await requestCode();

    await expect(
      context.verifySignInCode().execute({ journeyId: null, code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
  });

  it('décompte chaque code faux, invalide le parcours à la cinquième et refuse tout ce qui suit', async () => {
    await activateAccount();
    const journeyId = await requestCode();

    await expect(
      context.verifySignInCode().execute({ journeyId, code: '000000' }),
    ).rejects.toThrow(SignInCodeRejectedError);
    expect((await context.journeys.findById(journeyId))?.attemptsLeft).toBe(4);

    for (let attempt = 2; attempt < 5; attempt += 1) {
      await expect(
        context.verifySignInCode().execute({ journeyId, code: '000000' }),
      ).rejects.toThrow(SignInCodeRejectedError);
    }

    await expect(
      context.verifySignInCode().execute({ journeyId, code: '000000' }),
    ).rejects.toThrow(SignInAttemptsExhaustedError);

    await expect(
      context.verifySignInCode().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
    expect(context.sessions.count()).toBe(0);
  });

  it('refuse un code de connexion sur la confirmation d inscription', async () => {
    await registerAccount();
    const signInJourneyId = await requestCode();

    await expect(
      context
        .confirmRegistration()
        .execute({ journeyId: signInJourneyId, code: TEST_CODE }),
    ).rejects.toThrow(VerificationJourneyNotFoundError);
  });

  it('refuse un code d inscription sur la vérification de connexion', async () => {
    const accountId = await registerAccount();
    const signUpJourney = await context.journeys.findActiveForAccount(
      accountId,
      VerificationPurpose.SignUp,
    );

    await expect(
      context
        .verifySignInCode()
        .execute({ journeyId: signUpJourney?.id ?? '', code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
    expect(context.sessions.count()).toBe(0);
  });

  it('refuse un code de réinitialisation sur la vérification de connexion', async () => {
    await activateAccount();
    const reset = await context
      .requestPasswordReset()
      .execute({ email: EMAIL });

    await expect(
      context
        .verifySignInCode()
        .execute({ journeyId: reset.journeyId, code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
  });

  it('refuse un code correct une fois le parcours expiré', async () => {
    await activateAccount();
    const journeyId = await requestCode();
    context.clock.advanceBy(11 * 60 * 1000);

    await expect(
      context.verifySignInCode().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(SignInCodeRejectedError);
  });
});
