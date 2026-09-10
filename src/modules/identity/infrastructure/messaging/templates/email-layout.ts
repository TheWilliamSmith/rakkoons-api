import {
  BRAND_NAME,
  CodeEmailCopy,
  EmailCopy,
  spelledOutCode,
  validityLine,
} from '../content/email-copy';
import { EmailContent } from '../outbound-email';
import { EmailMetrics, EmailStyle, NARROW_CARD_RULE } from './email-theme';

export interface CodeEmailParameters {
  copy: CodeEmailCopy;
  code: string;
  validityMinutes: number;
}

const ESCAPED_CHARACTERS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => ESCAPED_CHARACTERS[character],
  );
}

export function renderCodeEmail(parameters: CodeEmailParameters): EmailContent {
  return {
    subject: parameters.copy.subject,
    html: renderHtml(parameters),
    text: renderText(parameters),
  };
}

function renderHtml(parameters: CodeEmailParameters): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${escape(parameters.copy.subject)}</title>`,
    `<style>${NARROW_CARD_RULE}</style>`,
    '</head>',
    `<body style="${EmailStyle.Body}">`,
    `<div style="${EmailStyle.Preheader}">${escape(parameters.copy.preheader)}</div>`,
    table(EmailStyle.Page, '100%', [
      `<tr><td align="center" style="${EmailStyle.PageCell}">`,
      table(EmailStyle.Card, EmailMetrics.CardWidthAttribute, [
        `<tr><td class="rk-card" style="${EmailStyle.CardBody}">`,
        renderLogo(),
        `<h1 style="${EmailStyle.Heading}">${escape(parameters.copy.heading)}</h1>`,
        `<p style="${EmailStyle.Lede}">${escape(parameters.copy.lede)}</p>`,
        renderCode(parameters.code),
        `<p style="${EmailStyle.Validity}">${escape(validityLine(parameters.validityMinutes))}</p>`,
        `<hr style="${EmailStyle.Rule}">`,
        `<p style="${EmailStyle.Footer}">${escape(EmailCopy.footer)}</p>`,
        '</td></tr>',
      ]),
      '</td></tr>',
    ]),
    '</body>',
    '</html>',
  ].join('');
}

function renderLogo(): string {
  return [
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="${EmailStyle.LogoRow}">`,
    '<tr>',
    `<td width="10" height="10" style="${EmailStyle.LogoDot}">&nbsp;</td>`,
    `<td style="${EmailStyle.LogoWord}">${BRAND_NAME}</td>`,
    '</tr>',
    '</table>',
  ].join('');
}

function renderCode(code: string): string {
  return table('', '100%', [
    `<tr><td style="${EmailStyle.CodeCell}">`,
    table('', '100%', [
      `<tr><td style="${EmailStyle.CodeBlock}">`,
      `<span role="img" aria-label="${escape(spelledOutCode(code))}" style="${EmailStyle.Code}">${escape(code)}</span>`,
      '</td></tr>',
    ]),
    '</td></tr>',
  ]);
}

function table(style: string, width: string, rows: string[]): string {
  const styled = style === '' ? '' : ` style="${style}"`;

  return [
    `<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0"${styled}>`,
    ...rows,
    '</table>',
  ].join('');
}

function renderText(parameters: CodeEmailParameters): string {
  return [
    BRAND_NAME,
    '',
    parameters.copy.heading,
    '',
    parameters.copy.lede,
    '',
    parameters.code,
    '',
    validityLine(parameters.validityMinutes),
    '',
    EmailCopy.footer,
  ].join('\n');
}
