import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { AccountStatus } from '../domain/account/account-status';
import { VerificationAttemptsExhaustedError } from '../domain/errors/verification-attempts-exhausted.error';
import { VerificationCodeRejectedError } from '../domain/errors/verification-code-rejected.error';
import { VerificationJourneyNotFoundError } from '../domain/errors/verification-journey-not-found.error';

const MINUTE = 60 * 1000;
const WRONG_CODE = '000000';

const VALID_INPUT = {
  username: 'rakkoonette',
  email: 'william@rakkoons.fr',
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('ConfirmRegistrationUseCase', () => {
  let context: IdentityTestContext;
  let journeyId: string;

  beforeEach(async () => {
    context = new IdentityTestContext();
    journeyId = (await context.registerAccount().execute(VALID_INPUT))
      .journeyId;
  });

  async function accountStatus(): Promise<string | undefined> {
    const journey = await context.journeys.findById(journeyId);
    const account = await context.accounts.findById(journey?.accountId ?? '');
    return account?.status;
  }

  it('active le compte et consomme le parcours', async () => {
    await context.confirmRegistration().execute({ journeyId, code: TEST_CODE });

    expect(await accountStatus()).toBe(AccountStatus.Active);
    expect((await context.journeys.findById(journeyId))?.isConsumed()).toBe(
      true,
    );
  });

  it('n ouvre aucune session', async () => {
    await context.confirmRegistration().execute({ journeyId, code: TEST_CODE });

    expect(context.sessions.count()).toBe(0);
  });

  it('décompte une tentative sur un code faux sans rien activer', async () => {
    await expect(
      context.confirmRegistration().execute({ journeyId, code: WRONG_CODE }),
    ).rejects.toThrow(VerificationCodeRejectedError);

    expect((await context.journeys.findById(journeyId))?.attemptsLeft).toBe(4);
    expect(await accountStatus()).toBe(AccountStatus.Pending);
  });

  it('invalide le parcours à la sixième tentative', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        context.confirmRegistration().execute({ journeyId, code: WRONG_CODE }),
      ).rejects.toThrow(VerificationCodeRejectedError);
    }

    await expect(
      context.confirmRegistration().execute({ journeyId, code: WRONG_CODE }),
    ).rejects.toThrow(VerificationAttemptsExhaustedError);

    await expect(
      context.confirmRegistration().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(VerificationCodeRejectedError);
    expect(await accountStatus()).toBe(AccountStatus.Pending);
  });

  it('échoue comme un code faux sur un parcours expiré', async () => {
    context.clock.advanceBy(16 * MINUTE);

    await expect(
      context.confirmRegistration().execute({ journeyId, code: TEST_CODE }),
    ).rejects.toThrow(VerificationCodeRejectedError);
    expect(await accountStatus()).toBe(AccountStatus.Pending);
  });

  it('refuse tous les codes sur un parcours ouvert pour une adresse déjà enregistrée', async () => {
    const decoy = await context
      .registerAccount()
      .execute({ ...VALID_INPUT, username: 'autrekoon' });

    await expect(
      context
        .confirmRegistration()
        .execute({ journeyId: decoy.journeyId, code: TEST_CODE }),
    ).rejects.toThrow(VerificationCodeRejectedError);
    expect(await accountStatus()).toBe(AccountStatus.Pending);
  });

  it('refuse un parcours inconnu', async () => {
    await expect(
      context
        .confirmRegistration()
        .execute({ journeyId: 'inconnu', code: TEST_CODE }),
    ).rejects.toThrow(VerificationJourneyNotFoundError);
  });
});
