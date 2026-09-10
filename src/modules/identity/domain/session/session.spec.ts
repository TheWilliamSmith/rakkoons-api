import { PasswordHash } from '../value-objects/password-hash';
import { Session } from './session';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const SLIDING = 14 * DAY;
const ABSOLUTE = 60 * DAY;
const OPENED_AT = new Date('2026-01-01T10:00:00.000Z');

function open(): Session {
  return Session.open({
    id: 'session-1',
    accountId: 'account-1',
    identifierHash: PasswordHash.fromStoredValue('hashed:secret'),
    slidingLifetime: SLIDING,
    absoluteLifetime: ABSOLUTE,
    openedAt: OPENED_AT,
  });
}

function at(milliseconds: number): Date {
  return new Date(OPENED_AT.getTime() + milliseconds);
}

describe('Session', () => {
  it('est utilisable dès son ouverture', () => {
    expect(open().isUsableAt(OPENED_AT)).toBe(true);
  });

  it('repousse son échéance glissante à chaque usage', () => {
    const session = open();

    session.extend(at(DAY), SLIDING);

    expect(session.expiresAt).toEqual(at(DAY + SLIDING));
    expect(session.lastUsedAt).toEqual(at(DAY));
  });

  it('ne repousse jamais l échéance au delà de la durée absolue', () => {
    const session = open();

    session.extend(at(ABSOLUTE - DAY), SLIDING);

    expect(session.expiresAt).toEqual(at(ABSOLUTE));
    expect(session.isUsableAt(at(ABSOLUTE))).toBe(false);
  });

  it('cesse d être utilisable passée l échéance glissante', () => {
    expect(open().isUsableAt(at(SLIDING))).toBe(false);
  });

  it('cesse d être utilisable passée la durée absolue même après usage', () => {
    const session = open();

    session.extend(at(ABSOLUTE - MINUTE), SLIDING);

    expect(session.isUsableAt(at(ABSOLUTE - MINUTE))).toBe(true);
    expect(session.isUsableAt(at(ABSOLUTE))).toBe(false);
  });

  it('cesse d être utilisable une fois révoquée', () => {
    const session = open();

    session.revoke(at(MINUTE));

    expect(session.isUsableAt(at(MINUTE))).toBe(false);
    expect(session.revokedAt).toEqual(at(MINUTE));
  });
});
