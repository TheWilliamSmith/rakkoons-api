export const BRAND_NAME = 'Rakkoons';

export interface CodeEmailCopy {
  subject: string;
  preheader: string;
  heading: string;
  lede: string;
}

export const EmailCopy = {
  footer:
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
  },
  accountDeletionNotice: {
    subject: `Suppression de votre compte ${BRAND_NAME}`,
    preheader: 'Votre compte sera supprimé, vous pouvez encore revenir.',
    heading: 'Votre compte va être supprimé',
    lede: 'Vous avez demandé la suppression de votre compte et de vos données.',
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

export function newAddressLine(address: string): string {
  return `Nouvelle adresse : ${address}`;
}

export function deletionDeadlineLine(day: string): string {
  return `Elle deviendra définitive le ${day}. Reconnectez-vous avant cette date pour l'annuler.`;
}

export function spelledOutCode(code: string): string {
  return [...code].join(' ');
}
