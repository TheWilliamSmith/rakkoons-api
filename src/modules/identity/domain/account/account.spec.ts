import { AccountAlreadyActivatedError } from '../errors/account-already-activated.error';
import { CredentialsRejectedError } from '../errors/credentials-rejected.error';
import { TermsNotAcceptedError } from '../errors/terms-not-accepted.error';
import { EmailAddress } from '../value-objects/email-address';
import { PasswordHash } from '../value-objects/password-hash';
import { PlainPassword } from '../value-objects/plain-password';
import { Username } from '../value-objects/username';
import { TrivialPasswordHasher } from '@test/identity/in-memory/trivial-password-hasher';
import { Account } from './account';
import { AccountStatus } from './account-status';

const REGISTERED_AT = new Date('2026-01-01T10:00:00.000Z');
const PASSWORD = 'MotDePasseQuiGagne1!';

function register(hasAcceptedTerms = true): Account {
  return Account.register({
    id: 'account-1',
    username: Username.create('rakkoonette'),
    email: EmailAddress.create('william@rakkoons.fr'),
    passwordHash: PasswordHash.fromStoredValue(`hashed:${PASSWORD}`),
    hasAcceptedTerms,
    termsVersion: '2026-01',
    registeredAt: REGISTERED_AT,
  });
}

describe('Account', () => {
  it('naît en attente et enregistre le consentement', () => {
    const account = register();

    expect(account.status).toBe(AccountStatus.Pending);
    expect(account.isActive()).toBe(false);
    expect(account.termsAcceptedAt).toEqual(REGISTERED_AT);
    expect(account.termsVersion).toBe('2026-01');
  });

  it('refuse de naître sans consentement aux conditions', () => {
    expect(() => register(false)).toThrow(TermsNotAcceptedError);
  });

  it('passe à actif à son activation', () => {
    const account = register();
    const activatedAt = new Date('2026-01-01T10:05:00.000Z');

    account.activate(activatedAt);

    expect(account.isActive()).toBe(true);
    expect(account.updatedAt).toEqual(activatedAt);
  });

  it('refuse une seconde activation', () => {
    const account = register();
    account.activate(new Date('2026-01-01T10:05:00.000Z'));

    expect(() =>
      account.activate(new Date('2026-01-01T10:06:00.000Z')),
    ).toThrow(AccountAlreadyActivatedError);
  });

  it('accepte des identifiants valides', async () => {
    const account = register();

    await expect(
      account.verifyCredentials(
        PlainPassword.create(PASSWORD),
        new TrivialPasswordHasher(),
      ),
    ).resolves.toBeUndefined();
  });

  it('refuse un mot de passe qui ne correspond pas', async () => {
    const account = register();

    await expect(
      account.verifyCredentials(
        PlainPassword.create('MauvaisMotDePasse1!'),
        new TrivialPasswordHasher(),
      ),
    ).rejects.toThrow(CredentialsRejectedError);
  });

  it('ne laisse pas modifier ses dates depuis l extérieur', () => {
    const account = register();
    const createdAt = account.createdAt;
    createdAt.setFullYear(1999);

    expect(account.createdAt).toEqual(REGISTERED_AT);
  });
});
