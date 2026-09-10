export const BRAND_NAME = 'Rakkoons';

export const EmailPalette = {
  Mist: '#f5f7fb',
  Paper: '#ffffff',
  Line: '#e3e8f3',
  Ink: '#0c1220',
  InkSoft: '#55627c',
  Brand: '#c2410c',
} as const;

export const EmailMetrics = {
  CardWidth: '400px',
  CardWidthAttribute: '400',
  CardRadius: '20px',
  ControlRadius: '8px',
  Gutter: '24px',
} as const;

export const FONT_STACK =
  "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const WEB_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600&display=swap';

export const EmailStyle = {
  Page: `margin:0;padding:${EmailMetrics.Gutter} 12px;background-color:${EmailPalette.Mist};`,
  Card: `width:100%;max-width:${EmailMetrics.CardWidth};background-color:${EmailPalette.Paper};border:1px solid ${EmailPalette.Line};border-radius:${EmailMetrics.CardRadius};`,
  CardBody: `padding:${EmailMetrics.Gutter};font-family:${FONT_STACK};color:${EmailPalette.Ink};`,
  Logo: `margin:0 0 ${EmailMetrics.Gutter};font-family:${FONT_STACK};font-size:18px;font-weight:600;letter-spacing:-0.012em;color:${EmailPalette.Ink};`,
  LogoDot: `color:${EmailPalette.Brand};`,
  Heading: `margin:0 0 12px;font-family:${FONT_STACK};font-size:30px;font-weight:600;letter-spacing:-0.024em;line-height:1.2;color:${EmailPalette.Ink};`,
  Lede: `margin:0 0 ${EmailMetrics.Gutter};font-family:${FONT_STACK};font-size:17px;font-weight:400;line-height:1.6;color:${EmailPalette.InkSoft};`,
  CodeBlock: `padding:16px;background-color:${EmailPalette.Mist};border-radius:${EmailMetrics.ControlRadius};`,
  Code: `margin:0;font-family:${FONT_STACK};font-size:30px;font-weight:600;letter-spacing:0.3em;text-indent:0.3em;line-height:1.2;text-align:center;color:${EmailPalette.Ink};`,
  Validity: `margin:12px 0 0;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${EmailPalette.InkSoft};`,
  Rule: `margin:${EmailMetrics.Gutter} 0;border:0;border-top:1px solid ${EmailPalette.Line};`,
  Footer: `margin:0;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${EmailPalette.InkSoft};`,
} as const;
