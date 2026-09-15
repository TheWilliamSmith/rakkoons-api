import { EmailChangeNotRequestedError } from '../errors/email-change-not-requested.error';
import { EmailAddress } from '../value-objects/email-address';
import { PasswordHash } from '../value-objects/password-hash';
import { Username } from '../value-objects/username';
import { Account } from './account';

const REGISTERED_AT = new Date('2026-01-01T10:00:00.000Z');
const REQUESTED_AT = new Date('2026-01-01T10:05:00.000Z');
const CANCELLED_AT = new Date('2026-01-01T10:09:00.000Z');
const EMAIL = 'william@rakkoons.fr';
const NEW_EMAIL = 'nouvelle@rakkoons.fr';

function register(): Account {
  return Account.register({
    id: 'account-1',
    username: Username.create('rakkoonette'),
    email: EmailAddress.create(EMAIL),
    passwordHash: PasswordHash.fromStoredValue('hashed:secret'),
    hasAcceptedTerms: true,
    termsVersion: '2026-01',
    registeredAt: REGISTERED_AT,
  });
}

describe('Account.cancelEmailChange', () => {
  it('retire l adresse en attente sans toucher à l adresse confirmée', () => {
    const account = register();
    account.requestEmailChange(EmailAddress.create(NEW_EMAIL), REQUESTED_AT);

    account.cancelEmailChange(CANCELLED_AT);

    expect(account.pendingEmail).toBeNull();
    expect(account.email.toString()).toBe(EMAIL);
    expect(account.updatedAt).toEqual(CANCELLED_AT);
  });

  it('refuse une annulation sans changement en attente', () => {
    const account = register();

    expect(() => account.cancelEmailChange(CANCELLED_AT)).toThrow(
      EmailChangeNotRequestedError,
    );
    expect(account.updatedAt).toEqual(REGISTERED_AT);
  });

  it('refuse une seconde annulation après la première', () => {
    const account = register();
    account.requestEmailChange(EmailAddress.create(NEW_EMAIL), REQUESTED_AT);
    account.cancelEmailChange(CANCELLED_AT);

    expect(() => account.cancelEmailChange(CANCELLED_AT)).toThrow(
      EmailChangeNotRequestedError,
    );
  });

  it('refuse une confirmation après une annulation', () => {
    const account = register();
    account.requestEmailChange(EmailAddress.create(NEW_EMAIL), REQUESTED_AT);
    account.cancelEmailChange(CANCELLED_AT);

    expect(() => account.confirmEmailChange(CANCELLED_AT)).toThrow(
      EmailChangeNotRequestedError,
    );
    expect(account.email.toString()).toBe(EMAIL);
  });
});
