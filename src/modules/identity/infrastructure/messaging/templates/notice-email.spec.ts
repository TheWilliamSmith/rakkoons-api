import { EmailCopy } from '../content/email-copy';
import { accountDeletionCancelledEmail } from './account-deletion-cancelled.email';
import { emailChangeNoticeEmail } from './email-change-notice.email';
import { passwordChangedEmail } from './password-changed.email';
import { passwordResetCompletedEmail } from './password-reset-completed.email';
import { registrationConfirmedEmail } from './registration-confirmed.email';
import { usernameChangedEmail } from './username-changed.email';

const notices = [
  {
    name: 'inscription confirmée',
    email: registrationConfirmedEmail('rakkoonette'),
  },
  { name: 'mot de passe modifié', email: passwordChangedEmail() },
  { name: 'mot de passe réinitialisé', email: passwordResetCompletedEmail() },
  { name: 'nom modifié', email: usernameChangedEmail('rakkoonette2') },
  { name: 'suppression annulée', email: accountDeletionCancelledEmail() },
  {
    name: 'adresse modifiée',
    email: emailChangeNoticeEmail('nouvelle@rakkoons.fr'),
  },
];

describe('e-mails de confirmation', () => {
  it('ne porte jamais de bloc de code', () => {
    notices.forEach(({ email }) => {
      expect(email.html).not.toContain('letter-spacing:0.3em');
      expect(email.html).not.toContain('aria-label=');
    });
  });

  it('ne conseille jamais d ignorer un changement déjà appliqué', () => {
    notices
      .filter(
        ({ email }) =>
          email.subject !== EmailCopy.registrationConfirmed.subject,
      )
      .forEach(({ email }) => {
        expect(email.text).not.toContain(EmailCopy.codeFooter);
        expect(email.text).toContain('réinitialisez votre mot de passe');
      });
  });

  it('porte un objet sans point final et sans emoji', () => {
    notices.forEach(({ email }) => {
      expect(email.subject).not.toMatch(/[.!?]$/);
      expect(email.subject).toContain('Rakkoons');
    });
  });

  it('respecte les contraintes de rendu du gabarit', () => {
    notices.forEach(({ email }) => {
      expect(email.html.startsWith('<!DOCTYPE html><html lang="fr">')).toBe(
        true,
      );
      expect(email.html.split('<h1').length - 1).toBe(1);
      expect(email.html).not.toContain('box-shadow');
      expect(email.html).not.toContain('<img');
      expect(email.html).not.toMatch(/\d(\.\d+)?rem/);
    });
  });

  it('porte la même information en texte brut', () => {
    notices.forEach(({ email }) => {
      expect(email.text.startsWith('Rakkoons')).toBe(true);
      expect(email.text.trim().length).toBeGreaterThan(0);
    });
  });

  it('nomme l utilisateur dans la confirmation d inscription', () => {
    const email = registrationConfirmedEmail('rakkoonette');

    expect(email.text).toContain('rakkoonette');
    expect(email.html).toContain('rakkoonette');
  });

  it('annonce le nouveau nom dans la confirmation de renommage', () => {
    expect(usernameChangedEmail('rakkoonette2').text).toContain('rakkoonette2');
  });

  it('signale la fermeture des autres sessions après un mot de passe changé', () => {
    expect(passwordChangedEmail().text).toContain('sessions ont été fermées');
    expect(passwordResetCompletedEmail().text).toContain(
      'sessions ont été fermées',
    );
  });

  it('se passe de ligne de détail quand il n y a rien à préciser', () => {
    const email = accountDeletionCancelledEmail();

    expect(email.text.split('\n').filter((line) => line !== '')).toEqual([
      'Rakkoons',
      EmailCopy.accountDeletionCancelled.heading,
      EmailCopy.accountDeletionCancelled.lede,
      EmailCopy.accountDeletionCancelled.footer,
    ]);
  });
});
