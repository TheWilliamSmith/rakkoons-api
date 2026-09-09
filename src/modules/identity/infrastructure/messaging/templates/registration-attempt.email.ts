import { EmailContent } from '../outbound-email';
import { BRAND_NAME, renderEmail } from './email-layout';

export function registrationAttemptEmail(): EmailContent {
  return renderEmail({
    subject: `Tentative d'inscription avec votre adresse ${BRAND_NAME}`,
    heading: 'Votre adresse est déjà utilisée',
    paragraphs: [
      `Quelqu'un vient de tenter de créer un compte ${BRAND_NAME} avec cette adresse e-mail. Un compte existe déjà, aucun nouveau compte n'a été créé et aucun code n'a été envoyé.`,
      "Si c'était vous, connectez-vous simplement avec vos identifiants habituels.",
    ],
    footer:
      "Si vous n'êtes pas à l'origine de cette tentative, aucune action n'est nécessaire. Par prudence, changez votre mot de passe si vous le réutilisez ailleurs.",
  });
}
