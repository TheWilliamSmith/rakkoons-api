import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { PasswordResetAttemptsExhaustedError } from '../domain/errors/password-reset-attempts-exhausted.error';
import { PasswordResetCodeRejectedError } from '../domain/errors/password-reset-code-rejected.error';

const EMAIL = 'william@rakkoons.fr';

describe('VerifyPasswordResetCodeUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  async function openReset(): Promise<string> {
    const registration = await context.registerAccount().execute({
      username: 'rakkoonette',
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });
    await context
      .confirmRegistration()
      .execute({ journeyId: registration.journeyId, code: TEST_CODE });

    const reset = await context.requestPasswordReset().execute({
      email: EMAIL,
    });

    return reset.journeyId;
  }

  it('marque le parcours vérifié sans le consommer', async () => {
    const journeyId = await openReset();

    await context
      .verifyPasswordResetCode()
      .execute({ journeyId, code: TEST_CODE });

    const journey = await context.journeys.findById(journeyId);

    expect(journey?.isVerified()).toBe(true);
    expect(journey?.isConsumed()).toBe(false);
  });

  it('refuse un code faux et retient la tentative', async () => {
    const journeyId = await openReset();

    await expect(
      context.verifyPasswordResetCode().execute({ journeyId, code: '000000' }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);

    expect((await context.journeys.findById(journeyId))?.attemptsLeft).toBe(4);
  });

  it('refuse à l identique quand le cookie de parcours manque', async () => {
    await openReset();

    await expect(
      context
        .verifyPasswordResetCode()
        .execute({ journeyId: null, code: TEST_CODE }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse à l identique un code mal formé', async () => {
    const journeyId = await openReset();

    await expect(
      context.verifyPasswordResetCode().execute({ journeyId, code: 'abc' }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse à l identique un parcours d inscription présenté comme une réinitialisation', async () => {
    const registration = await context.registerAccount().execute({
      username: 'rakkoonette',
      email: EMAIL,
      password: TEST_PASSWORD,
      hasAcceptedTerms: true,
    });

    await expect(
      context
        .verifyPasswordResetCode()
        .execute({ journeyId: registration.journeyId, code: TEST_CODE }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('invalide le parcours à la cinquième tentative manquée', async () => {
    const journeyId = await openReset();

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(
        context
          .verifyPasswordResetCode()
          .execute({ journeyId, code: '000000' }),
      ).rejects.toThrow(PasswordResetCodeRejectedError);
    }

    await expect(
      context.verifyPasswordResetCode().execute({ journeyId, code: '000000' }),
    ).rejects.toThrow(PasswordResetAttemptsExhaustedError);

    await expect(
      context.verifyPasswordResetCode().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });

  it('refuse un code correct une fois le parcours expiré', async () => {
    const journeyId = await openReset();
    context.clock.advanceBy(16 * 60 * 1000);

    await expect(
      context.verifyPasswordResetCode().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(PasswordResetCodeRejectedError);
  });
});
