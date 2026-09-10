import { AccountStatus } from './account-status';
import { Account } from './account';
import { EmailAddress } from '../value-objects/email-address';
import { PasswordHash } from '../value-objects/password-hash';
import { Username } from '../value-objects/username';

const REGISTERED_AT = new Date('2026-01-01T10:00:00.000Z');
const CONFIRMED_AT = new Date('2026-01-01T10:05:00.000Z');

function register(): Account {
  return Account.register({
    id: 'account-1',
    username: Username.create('rakkoonette'),
    email: EmailAddress.create('william@rakkoons.fr'),
    passwordHash: PasswordHash.fromStoredValue('hashed:secret'),
    hasAcceptedTerms: true,
    termsVersion: '2026-01',
    registeredAt: REGISTERED_AT,
  });
}

describe('Account.confirmEmailPossession', () => {
  it('active un compte en attente', () => {
    const account = register();

    account.confirmEmailPossession(CONFIRMED_AT);

    expect(account.status).toBe(AccountStatus.Active);
    expect(account.isActive()).toBe(true);
    expect(account.updatedAt).toEqual(CONFIRMED_AT);
  });

  it('laisse un compte déjà actif intact', () => {
    const account = register();
    account.activate(REGISTERED_AT);

    account.confirmEmailPossession(CONFIRMED_AT);

    expect(account.status).toBe(AccountStatus.Active);
    expect(account.updatedAt).toEqual(REGISTERED_AT);
  });
});
