import { EmailContent } from '../outbound-email';
import { renderCodeEmail } from './email-layout';
import { BRAND_NAME } from './email-theme';

export function signInCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderCodeEmail({
    subject: `Votre code de connexion ${BRAND_NAME}`,
    heading: 'Connectez-vous à Rakkoons',
    lede: 'Voici le code à saisir pour ouvrir votre session.',
    code,
    validity: `Il expire dans ${validityMinutes} minutes et ne peut servir qu'une seule fois.`,
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : aucune session ne sera ouverte sans ce code.",
  });
}
