import { EmailContent } from '../outbound-email';

export const BRAND_NAME = 'Rakkoons';

const BODY_STYLE =
  'margin:0;padding:24px;background:#f6f5f3;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f1d1b;';
const CARD_STYLE =
  'max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;';
const HEADING_STYLE = 'margin:0 0 16px;font-size:20px;font-weight:600;';
const PARAGRAPH_STYLE = 'margin:0 0 16px;font-size:15px;line-height:1.6;';
const FOOTER_STYLE =
  'margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b6560;';

export interface EmailLayoutParameters {
  subject: string;
  heading: string;
  paragraphs: string[];
  highlight?: string;
  footer: string;
}

export function renderEmail(parameters: EmailLayoutParameters): EmailContent {
  const paragraphs = parameters.paragraphs
    .map((paragraph) => `<p style="${PARAGRAPH_STYLE}">${paragraph}</p>`)
    .join('');

  const highlight =
    parameters.highlight === undefined
      ? ''
      : `<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;">${parameters.highlight}</p>`;

  const html = `<div style="${BODY_STYLE}"><div style="${CARD_STYLE}"><h1 style="${HEADING_STYLE}">${parameters.heading}</h1>${paragraphs}${highlight}<p style="${FOOTER_STYLE}">${parameters.footer}</p></div></div>`;

  const text = [
    parameters.heading,
    '',
    ...parameters.paragraphs,
    ...(parameters.highlight === undefined ? [] : ['', parameters.highlight]),
    '',
    parameters.footer,
  ].join('\n');

  return { subject: parameters.subject, html, text };
}
