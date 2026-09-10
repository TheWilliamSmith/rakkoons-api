import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { AccountStatus } from '../domain/account/account-status';
import { EmailAlreadyRegisteredError } from '../domain/errors/email-already-registered.error';
import { UsernameAlreadyTakenError } from '../domain/errors/username-already-taken.error';

const VALID_INPUT = {
  username: 'rakkoonette',
  email: 'william@rakkoons.fr',
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('RegisterAccountUseCase', () => {
  let context: IdentityTestContext;

  beforeEach(() => {
    context = new IdentityTestContext();
  });

  it('crée un compte en attente, un parcours et déclenche un envoi de code', async () => {
    const output = await context.registerAccount().execute(VALID_INPUT);

    const journey = await context.journeys.findById(output.journeyId);
    const account = await context.accounts.findById(journey?.accountId ?? '');

    expect(account?.status).toBe(AccountStatus.Pending);
    expect(journey?.attemptsLeft).toBe(5);
    expect(context.messages.registrationCodes).toEqual([
      { recipient: 'william@rakkoons.fr', code: TEST_CODE },
    ]);
  });

  it('refuse un nom déjà pris et ne crée rien', async () => {
    await context.registerAccount().execute(VALID_INPUT);
    const accountsBefore = context.accounts.count();
    const journeysBefore = context.journeys.count();

    await expect(
      context.registerAccount().execute({
        ...VALID_INPUT,
        email: 'autre@rakkoons.fr',
      }),
    ).rejects.toThrow(UsernameAlreadyTakenError);

    expect(context.accounts.count()).toBe(accountsBefore);
    expect(context.journeys.count()).toBe(journeysBefore);
  });

  it('refuse une adresse déjà enregistrée et ne crée rien', async () => {
    await context.registerAccount().execute(VALID_INPUT);
    const accountsBefore = context.accounts.count();
    const journeysBefore = context.journeys.count();
    const codesBefore = context.codes.generatedCount;

    await expect(
      context.registerAccount().execute({
        ...VALID_INPUT,
        username: 'autrekoon',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    expect(context.accounts.count()).toBe(accountsBefore);
    expect(context.journeys.count()).toBe(journeysBefore);
    expect(context.codes.generatedCount).toBe(codesBefore);
    expect(context.messages.registrationCodes).toHaveLength(1);
  });

  it('refuse une adresse déjà enregistrée quelle que soit la casse', async () => {
    await context.registerAccount().execute(VALID_INPUT);

    await expect(
      context.registerAccount().execute({
        ...VALID_INPUT,
        username: 'autrekoon',
        email: 'William@Rakkoons.FR',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('n échoue pas quand l envoi du message échoue', async () => {
    context.messages.sendRegistrationCode = (): Promise<void> =>
      Promise.reject(new Error('smtp down'));

    const output = await context.registerAccount().execute(VALID_INPUT);

    expect(typeof output.journeyId).toBe('string');
    expect(context.accounts.count()).toBe(1);
  });
});
