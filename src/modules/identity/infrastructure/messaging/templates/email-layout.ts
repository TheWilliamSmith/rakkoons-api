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

export interface NoticeEmailParameters {
  copy: CodeEmailCopy;
  detail: string;
}

interface EmailBody {
  subject: string;
  preheader: string;
  heading: string;
  lede: string;
  highlight: string | null;
  detail: string;
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
  return render({
    ...parameters.copy,
    highlight: parameters.code,
    detail: validityLine(parameters.validityMinutes),
  });
}

export function renderNoticeEmail(
  parameters: NoticeEmailParameters,
): EmailContent {
  return render({
    ...parameters.copy,
    highlight: null,
    detail: parameters.detail,
  });
}

function render(body: EmailBody): EmailContent {
  return {
    subject: body.subject,
    html: renderHtml(body),
    text: renderText(body),
  };
}

function renderHtml(body: EmailBody): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${escape(body.subject)}</title>`,
    `<style>${NARROW_CARD_RULE}</style>`,
    '</head>',
    `<body style="${EmailStyle.Body}">`,
    `<div style="${EmailStyle.Preheader}">${escape(body.preheader)}</div>`,
    table(EmailStyle.Page, '100%', [
      `<tr><td align="center" style="${EmailStyle.PageCell}">`,
      table(EmailStyle.Card, EmailMetrics.CardWidthAttribute, [
        `<tr><td class="rk-card" style="${EmailStyle.CardBody}">`,
        renderLogo(),
        `<h1 style="${EmailStyle.Heading}">${escape(body.heading)}</h1>`,
        `<p style="${EmailStyle.Lede}">${escape(body.lede)}</p>`,
        body.highlight === null ? '' : renderCode(body.highlight),
        `<p style="${detailStyle(body)}">${escape(body.detail)}</p>`,
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

function detailStyle(body: EmailBody): string {
  return body.highlight === null
    ? EmailStyle.DetachedDetail
    : EmailStyle.Validity;
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

function renderText(body: EmailBody): string {
  return [
    BRAND_NAME,
    '',
    body.heading,
    '',
    body.lede,
    ...(body.highlight === null ? [] : ['', body.highlight]),
    '',
    body.detail,
    '',
    EmailCopy.footer,
  ].join('\n');
}
