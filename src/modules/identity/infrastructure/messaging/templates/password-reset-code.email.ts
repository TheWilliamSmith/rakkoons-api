import { EmailContent } from '../outbound-email';
import { renderCodeEmail } from './email-layout';
import { BRAND_NAME } from './email-theme';

export function passwordResetCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderCodeEmail({
    subject: `Votre code de réinitialisation ${BRAND_NAME}`,
    heading: 'Réinitialisez votre mot de passe',
    lede: 'Voici le code à saisir pour choisir un nouveau mot de passe.',
    code,
    validity: `Il expire dans ${validityMinutes} minutes et ne peut servir qu'une seule fois.`,
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.",
  });
}
