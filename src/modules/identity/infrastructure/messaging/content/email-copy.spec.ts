import { EmailCopy, spelledOutCode, validityLine } from './email-copy';

describe('validityLine', () => {
  it('écrit le délai en toutes lettres', () => {
    expect(validityLine(10)).toBe('Ce code expire dans dix minutes.');
    expect(validityLine(15)).toBe('Ce code expire dans quinze minutes.');
  });

  it('accorde le singulier', () => {
    expect(validityLine(1)).toBe('Ce code expire dans une minute.');
  });

  it('retombe sur le chiffre pour un délai hors table', () => {
    expect(validityLine(37)).toBe('Ce code expire dans 37 minutes.');
  });
});

describe('spelledOutCode', () => {
  it('sépare les chiffres pour les lecteurs d écran', () => {
    expect(spelledOutCode('429861')).toBe('4 2 9 8 6 1');
  });
});

describe('EmailCopy', () => {
  const messages = [
    EmailCopy.registrationCode,
    EmailCopy.signInCode,
    EmailCopy.passwordResetCode,
  ];

  it('donne à chaque message un objet sans point final ni emoji', () => {
    for (const message of messages) {
      expect(message.subject).not.toMatch(/[.!?]$/);
      expect(message.subject).toMatch(/^[\w' À-ſ-]+$/u);
    }
  });

  it('donne à chaque message un pré-en-tête distinct de son objet', () => {
    for (const message of messages) {
      expect(message.preheader).not.toBe(message.subject);
      expect(message.preheader.length).toBeGreaterThan(0);
    }
  });

  it('n emploie qu un seul pied, partagé par tous les messages', () => {
    expect(EmailCopy.footer).toBe(
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    );
  });
});
