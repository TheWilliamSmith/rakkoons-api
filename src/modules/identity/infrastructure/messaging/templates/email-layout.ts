import { EmailContent } from '../outbound-email';
import {
  BRAND_NAME,
  EmailMetrics,
  EmailStyle,
  WEB_FONT_HREF,
} from './email-theme';

export interface CodeEmailParameters {
  subject: string;
  heading: string;
  lede: string;
  code: string;
  validity: string;
  footer: string;
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
    subject: parameters.subject,
    html: renderHtml(parameters),
    text: renderText(parameters),
  };
}

function renderHtml(parameters: CodeEmailParameters): string {
  return [
    `<link rel="stylesheet" href="${WEB_FONT_HREF}">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${EmailStyle.Page}">`,
    '<tr><td align="center">',
    `<table role="presentation" width="${EmailMetrics.CardWidthAttribute}" cellpadding="0" cellspacing="0" border="0" style="${EmailStyle.Card}">`,
    `<tr><td style="${EmailStyle.CardBody}">`,
    `<p style="${EmailStyle.Logo}">${BRAND_NAME}<span style="${EmailStyle.LogoDot}">.</span></p>`,
    `<h1 style="${EmailStyle.Heading}">${escape(parameters.heading)}</h1>`,
    `<p style="${EmailStyle.Lede}">${escape(parameters.lede)}</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${EmailStyle.CodeBlock}">`,
    `<p style="${EmailStyle.Code}">${escape(parameters.code)}</p>`,
    '</td></tr></table>',
    `<p style="${EmailStyle.Validity}">${escape(parameters.validity)}</p>`,
    `<hr style="${EmailStyle.Rule}">`,
    `<p style="${EmailStyle.Footer}">${escape(parameters.footer)}</p>`,
    '</td></tr></table>',
    '</td></tr></table>',
  ].join('');
}

function renderText(parameters: CodeEmailParameters): string {
  return [
    BRAND_NAME,
    '',
    parameters.heading,
    '',
    parameters.lede,
    '',
    parameters.code,
    '',
    parameters.validity,
    '',
    parameters.footer,
  ].join('\n');
}
