export const BRAND_NAME = 'Rakkoons';

export interface CodeEmailCopy {
  subject: string;
  preheader: string;
  heading: string;
  lede: string;
}

export interface NoticeEmailCopy extends CodeEmailCopy {
  footer: string;
}

const compromisedAccountAdvice =
  "Si vous n'êtes pas à l'origine de ce changement, réinitialisez votre mot de passe sans attendre : votre compte est peut-être compromis.";

export const EmailCopy = {
  codeFooter:
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  registrationCode: {
    subject: `Votre code de vérification ${BRAND_NAME}`,
    preheader: "Une dernière étape avant d'utiliser votre compte.",
    heading: 'Confirmez votre inscription',
    lede: 'Voici le code à saisir pour terminer la création de votre compte.',
  },
  signInCode: {
    subject: `Votre code de connexion ${BRAND_NAME}`,
    preheader: 'Saisissez ce code pour ouvrir votre session.',
    heading: 'Connectez-vous',
    lede: 'Voici le code à saisir pour ouvrir votre session.',
  },
  emailChangeCode: {
    subject: `Confirmez votre nouvelle adresse ${BRAND_NAME}`,
    preheader: 'Saisissez ce code pour confirmer votre nouvelle adresse.',
    heading: 'Confirmez votre nouvelle adresse',
    lede: 'Voici le code à saisir pour rattacher cette adresse à votre compte.',
  },
  emailChangeNotice: {
    subject: `L'adresse de votre compte ${BRAND_NAME} a changé`,
    preheader: "L'adresse de connexion de votre compte vient d'être modifiée.",
    heading: 'Votre adresse a été modifiée',
    lede: "L'adresse de connexion de votre compte vient d'être remplacée.",
    footer: compromisedAccountAdvice,
  },
  accountDeletionNotice: {
    subject: `Suppression de votre compte ${BRAND_NAME}`,
    preheader: 'Votre compte sera supprimé, vous pouvez encore revenir.',
    heading: 'Votre compte va être supprimé',
    lede: 'Vous avez demandé la suppression de votre compte et de vos données.',
    footer: compromisedAccountAdvice,
  },
  registrationConfirmed: {
    subject: `Votre compte ${BRAND_NAME} est prêt`,
    preheader: 'Votre adresse est confirmée, votre espace vous attend.',
    heading: 'Votre compte est prêt',
    lede: 'Votre adresse est confirmée et votre espace est ouvert.',
    footer:
      "Vous recevez cet e-mail parce qu'un compte vient d'être ouvert avec cette adresse.",
  },
  passwordChanged: {
    subject: `Votre mot de passe ${BRAND_NAME} a changé`,
    preheader: "Le mot de passe de votre compte vient d'être modifié.",
    heading: 'Votre mot de passe a été modifié',
    lede: "Le mot de passe de votre compte vient d'être remplacé.",
    footer: compromisedAccountAdvice,
  },
  passwordResetCompleted: {
    subject: `Votre mot de passe ${BRAND_NAME} a été réinitialisé`,
    preheader: 'Un nouveau mot de passe a été défini pour votre compte.',
    heading: 'Votre mot de passe a été réinitialisé',
    lede: "Un nouveau mot de passe vient d'être défini pour votre compte.",
    footer: compromisedAccountAdvice,
  },
  usernameChanged: {
    subject: `Votre nom d'utilisateur ${BRAND_NAME} a changé`,
    preheader: "Le nom d'utilisateur de votre compte vient d'être modifié.",
    heading: "Votre nom d'utilisateur a été modifié",
    lede: "Le nom d'utilisateur de votre compte vient d'être remplacé.",
    footer: compromisedAccountAdvice,
  },
  accountDeletionCancelled: {
    subject: `Suppression de votre compte ${BRAND_NAME} annulée`,
    preheader: 'Votre compte et vos données sont conservés.',
    heading: 'Votre compte est conservé',
    lede: 'La suppression programmée de votre compte a été annulée.',
    footer: compromisedAccountAdvice,
  },
  passwordResetCode: {
    subject: `Votre code de réinitialisation ${BRAND_NAME}`,
    preheader: 'Saisissez ce code pour choisir un nouveau mot de passe.',
    heading: 'Réinitialisez votre mot de passe',
    lede: 'Voici le code à saisir pour choisir un nouveau mot de passe.',
  },
} as const;

const SINGLE_MINUTE = 1;

const MINUTES_IN_WORDS: Record<number, string> = {
  1: 'une',
  2: 'deux',
  3: 'trois',
  4: 'quatre',
  5: 'cinq',
  6: 'six',
  7: 'sept',
  8: 'huit',
  9: 'neuf',
  10: 'dix',
  11: 'onze',
  12: 'douze',
  13: 'treize',
  14: 'quatorze',
  15: 'quinze',
  16: 'seize',
  17: 'dix-sept',
  18: 'dix-huit',
  19: 'dix-neuf',
  20: 'vingt',
  30: 'trente',
  45: 'quarante-cinq',
  60: 'soixante',
};

export function validityLine(minutes: number): string {
  const amount = MINUTES_IN_WORDS[minutes] ?? String(minutes);
  const unit = minutes === SINGLE_MINUTE ? 'minute' : 'minutes';

  return `Ce code expire dans ${amount} ${unit}.`;
}

export function revokedSessionsLine(): string {
  return 'Toutes vos autres sessions ont été fermées.';
}

export function newUsernameLine(username: string): string {
  return `Nouveau nom d'utilisateur : ${username}`;
}

export function welcomeLine(username: string): string {
  return `Vous êtes connu ici sous le nom ${username}.`;
}

export function newAddressLine(address: string): string {
  return `Nouvelle adresse : ${address}`;
}

export function deletionDeadlineLine(day: string): string {
  return `Elle deviendra définitive le ${day}. Reconnectez-vous avant cette date pour l'annuler.`;
}

export function spelledOutCode(code: string): string {
  return [...code].join(' ');
}
