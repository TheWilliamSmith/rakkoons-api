import {
  IdentityTestContext,
  TEST_CODE,
  TEST_PASSWORD,
} from '@test/identity/identity-test-context';
import { VerificationPurpose } from '../domain/verification/verification-purpose';

const EMAIL = 'william@rakkoons.fr';
const ORIGIN = '203.0.113.7';

const SIGN_UP_INPUT = {
  username: 'rakkoonette',
  email: EMAIL,
  password: TEST_PASSWORD,
  hasAcceptedTerms: true,
};

describe('RequestSignInCodeUseCase', () => {
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

  function request(
    email = EMAIL,
  ): ReturnType<
    ReturnType<IdentityTestContext['requestSignInCode']>['execute']
  > {
    return context.requestSignInCode().execute({ email, origin: ORIGIN });
  }

  it('crée un parcours de connexion et déclenche un envoi sur une adresse connue', async () => {
    const accountId = await activateAccount();

    const output = await request();
    const journey = await context.journeys.findById(output.journeyId);

    expect(journey?.purpose).toBe(VerificationPurpose.SignIn);
    expect(journey?.accountId).toBe(accountId);
    expect(journey?.attemptsLeft).toBe(5);
    expect(context.messages.signInCodes).toEqual([
      { recipient: EMAIL, code: TEST_CODE },
    ]);
  });

  it('crée un parcours sans code utilisable et n envoie rien sur une adresse inconnue', async () => {
    const output = await request('inconnu@rakkoons.fr');
    const journey = await context.journeys.findById(output.journeyId);

    expect(journey?.purpose).toBe(VerificationPurpose.SignIn);
    expect(journey?.accountId).toBeNull();
    expect(context.messages.signInCodes).toHaveLength(0);
  });

  it('sert un compte encore en attente d activation', async () => {
    await registerAccount();

    const output = await request();
    const journey = await context.journeys.findById(output.journeyId);

    expect(journey?.accountId).not.toBeNull();
    expect(context.messages.signInCodes).toHaveLength(1);
  });

  it('invalide le parcours de connexion précédent du même compte', async () => {
    await activateAccount();
    const first = await request();

    const second = await request();

    expect(
      (await context.journeys.findById(first.journeyId))?.isConsumed(),
    ).toBe(true);
    expect(
      (await context.journeys.findById(second.journeyId))?.isConsumed(),
    ).toBe(false);
    expect(context.messages.signInCodes).toHaveLength(2);
  });

  it('laisse intact le parcours d inscription en cours', async () => {
    const accountId = await registerAccount();

    await request();

    const signUp = await context.journeys.findActiveForAccount(
      accountId,
      VerificationPurpose.SignUp,
    );

    expect(signUp).not.toBeNull();
    expect(signUp?.isConsumed()).toBe(false);
  });

  it('n envoie rien et ne renouvelle pas le code quand la limite est atteinte', async () => {
    await activateAccount();
    const first = await request();
    context.signInCodeThrottle.allows = false;

    const second = await request();

    expect(second.journeyId).toBe(first.journeyId);
    expect(context.messages.signInCodes).toHaveLength(1);
    expect(
      (await context.journeys.findById(first.journeyId))?.isConsumed(),
    ).toBe(false);
  });

  it('rend un parcours sans code utilisable quand la limite est atteinte sans parcours en cours', async () => {
    await activateAccount();
    context.signInCodeThrottle.allows = false;

    const output = await request();
    const journey = await context.journeys.findById(output.journeyId);

    expect(journey).not.toBeNull();
    expect(context.messages.signInCodes).toHaveLength(0);
  });

  it('consulte la limite pour une adresse inconnue comme pour une adresse connue', async () => {
    await request('inconnu@rakkoons.fr');

    expect(context.signInCodeThrottle.consulted).toEqual([
      { recipient: 'inconnu@rakkoons.fr', origin: ORIGIN },
    ]);
  });

  it('rend un parcours et n envoie rien sur une adresse mal formée', async () => {
    const output = await request('pas-une-adresse');

    expect(typeof output.journeyId).toBe('string');
    expect(context.messages.signInCodes).toHaveLength(0);
  });

  it('n ouvre aucune session', async () => {
    await activateAccount();

    await request();

    expect(context.sessions.count()).toBe(0);
  });
});
