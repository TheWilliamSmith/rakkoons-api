export const EmailPalette = {
  Page: '#f5f7fb',
  Card: '#ffffff',
  Hairline: '#e3e8f3',
  Text: '#0c1220',
  TextSoft: '#55627c',
  Accent: '#c2410c',
  Link: '#9a3412',
  CodeBlock: '#f5f7fb',
} as const;

export const EmailMetrics = {
  CardWidth: '480px',
  CardWidthAttribute: '480',
  CardRadius: '20px',
  CodeRadius: '8px',
  CardPadding: '32px',
  CardPaddingNarrow: '24px',
  PageGutter: '16px',
  LogoDotSize: '10px',
} as const;

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const family = `font-family:${FONT_STACK};`;

export const EmailStyle = {
  Body: `margin:0;padding:0;background-color:${EmailPalette.Page};`,
  Preheader:
    'display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;',
  Page: `background-color:${EmailPalette.Page};`,
  PageCell: `padding:${EmailMetrics.CardPadding} ${EmailMetrics.PageGutter};`,
  Card: `width:100%;max-width:${EmailMetrics.CardWidth};background-color:${EmailPalette.Card};border:1px solid ${EmailPalette.Hairline};border-radius:${EmailMetrics.CardRadius};`,
  CardBody: `padding:${EmailMetrics.CardPadding};${family}color:${EmailPalette.Text};`,
  LogoRow: 'margin:0 auto 24px;',
  LogoDot: `width:${EmailMetrics.LogoDotSize};height:${EmailMetrics.LogoDotSize};background-color:${EmailPalette.Accent};border-radius:5px;font-size:0;line-height:0;`,
  LogoWord: `padding-left:8px;${family}font-size:18px;font-weight:600;line-height:1;color:${EmailPalette.Text};`,
  Heading: `margin:0 0 8px;${family}font-size:30px;font-weight:600;line-height:1.16;letter-spacing:-0.02em;text-align:center;color:${EmailPalette.Text};`,
  Lede: `margin:0;${family}font-size:19px;font-weight:400;line-height:1.6;text-align:center;color:${EmailPalette.TextSoft};`,
  CodeCell: 'padding:32px 0;',
  CodeBlock: `padding:16px;background-color:${EmailPalette.CodeBlock};border-radius:${EmailMetrics.CodeRadius};text-align:center;`,
  Code: `${family}font-size:32px;font-weight:600;line-height:1;letter-spacing:0.3em;text-indent:0.3em;color:${EmailPalette.Text};`,
  Validity: `margin:0;${family}font-size:14px;font-weight:400;line-height:1.6;text-align:center;color:${EmailPalette.TextSoft};`,
  Rule: `margin:24px 0;border:0;border-top:1px solid ${EmailPalette.Hairline};`,
  Footer: `margin:0;${family}font-size:14px;font-weight:400;line-height:1.6;color:${EmailPalette.TextSoft};`,
} as const;

export const NARROW_CARD_RULE = `@media only screen and (max-width:520px){.rk-card{padding:${EmailMetrics.CardPaddingNarrow} !important;}}`;
