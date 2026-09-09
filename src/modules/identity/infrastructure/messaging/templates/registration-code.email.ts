import { EmailContent } from '../outbound-email';
import { BRAND_NAME, renderEmail } from './email-layout';

export function registrationCodeEmail(
  code: string,
  validityMinutes: number,
): EmailContent {
  return renderEmail({
    subject: `Votre code de vérification ${BRAND_NAME}`,
    heading: 'Confirmez votre inscription',
    paragraphs: [
      `Voici le code à saisir pour terminer la création de votre compte ${BRAND_NAME}.`,
      `Il expire dans ${validityMinutes} minutes et ne peut servir qu'une seule fois.`,
    ],
    highlight: code,
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : aucun compte ne sera activé sans ce code.",
  });
}
