import { EmailCopy } from '../content/email-copy';
import { renderCodeEmail } from './email-layout';
import { EmailMetrics, EmailPalette, FONT_STACK } from './email-theme';

const CODE = '429861';

const email = renderCodeEmail({
  copy: EmailCopy.signInCode,
  code: CODE,
  validityMinutes: 10,
});

describe('renderCodeEmail', () => {
  it('produit un document complet en français avec un seul titre', () => {
    expect(email.html.startsWith('<!DOCTYPE html><html lang="fr">')).toBe(true);
    expect(email.html.split('<h1').length - 1).toBe(1);
    expect(email.html).not.toContain('<h2');
  });

  it('met en page par tables de présentation, sans flex ni grid ni position', () => {
    expect(email.html).toContain('<table role="presentation"');
    expect(email.html).not.toContain('display:flex');
    expect(email.html).not.toContain('display:grid');
    expect(email.html).not.toContain('position:absolute;top');
  });

  it('ne charge aucune ressource externe', () => {
    expect(email.html).not.toContain('<link');
    expect(email.html).not.toContain('<script');
    expect(email.html).not.toContain('<img');
    expect(email.html).not.toContain('http://');
    expect(email.html).not.toContain('https://');
  });

  it('valide le rendu sur la pile système, sans police web', () => {
    expect(FONT_STACK.startsWith('-apple-system')).toBe(true);
    expect(email.html).not.toContain('@font-face');
    expect(email.html).not.toContain('fonts.googleapis');
  });

  it('ne referme jamais un attribut de style par une guillemet interne', () => {
    for (const declaration of email.html.matchAll(/style="([^"]*)"/g)) {
      expect(declaration[1]).not.toContain('"');
    }

    expect(FONT_STACK).not.toContain('"');
    expect(email.html).toContain("'Segoe UI'");
  });

  it('n exprime aucune taille en rem', () => {
    expect(email.html).not.toMatch(/\d(\.\d+)?rem/);
  });

  it('n applique ni ombre ni dégradé', () => {
    expect(email.html).not.toContain('box-shadow');
    expect(email.html).not.toContain('gradient');
  });

  it('pose une colonne de 480px avec une gouttière d au moins 16px', () => {
    expect(email.html).toContain(`max-width:${EmailMetrics.CardWidth}`);
    expect(email.html).toContain(
      `padding:${EmailMetrics.CardPadding} ${EmailMetrics.PageGutter}`,
    );
    expect(parseInt(EmailMetrics.PageGutter, 10)).toBeGreaterThanOrEqual(16);
  });

  it('reste correct sans la requête de média, qui n apporte que du confort', () => {
    expect(email.html).toContain(`padding:${EmailMetrics.CardPadding};`);
    expect(email.html).toContain('@media');
    expect(email.html).toContain(EmailMetrics.CardPaddingNarrow);
  });

  it('pose les crans typographiques du gabarit', () => {
    expect(email.html).toContain('font-size:30px');
    expect(email.html).toContain('font-size:19px');
    expect(email.html).toContain('font-size:32px');
    expect(email.html).toContain('font-size:18px');
    expect(email.html).toContain('font-size:14px');
    expect(email.html).toContain('letter-spacing:-0.02em');
  });

  it('donne à la carte son rayon et à la pastille du code le sien', () => {
    expect(email.html).toContain(`border-radius:${EmailMetrics.CardRadius}`);
    expect(email.html).toContain(`border-radius:${EmailMetrics.CodeRadius}`);
  });

  it('rend le disque du logo par une cellule colorée, jamais par une image', () => {
    expect(email.html).toContain(
      `background-color:${EmailPalette.Accent};border-radius:5px`,
    );
    expect(email.html.split(EmailPalette.Accent)).toHaveLength(2);
  });

  it('porte un pré-en-tête masqué, distinct de l objet et sans le code', () => {
    expect(email.html).toContain(EmailCopy.signInCode.preheader);
    expect(EmailCopy.signInCode.preheader).not.toBe(
      EmailCopy.signInCode.subject,
    );
    expect(EmailCopy.signInCode.preheader).not.toContain(CODE);
  });

  it('écarte le code sans le décentrer', () => {
    expect(email.html).toContain('letter-spacing:0.3em;text-indent:0.3em;');
  });

  it('n affiche les chiffres qu une seule fois', () => {
    expect(email.html.split(CODE)).toHaveLength(2);
  });

  it('épelle le code pour les lecteurs d écran sans le redoubler à l écran', () => {
    expect(email.html).toContain('aria-label="4 2 9 8 6 1"');
    expect(email.html).not.toContain('>4 2 9 8 6 1<');
  });

  it('ne place jamais le code dans une URL ni dans un lien', () => {
    expect(email.html).not.toContain('<a ');
    expect(email.html).not.toContain(`=${CODE}`);
    expect(email.html).not.toContain(`/${CODE}`);
  });

  it('déclare un schéma de couleurs explicite pour les clients sombres', () => {
    expect(email.html).toContain('name="color-scheme" content="light"');
    expect(email.html).toContain('name="supported-color-schemes"');
  });

  it('porte la même information dans le même ordre en texte brut', () => {
    expect(email.text.split('\n').filter((line) => line !== '')).toEqual([
      'Rakkoons',
      EmailCopy.signInCode.heading,
      EmailCopy.signInCode.lede,
      CODE,
      'Ce code expire dans dix minutes.',
      EmailCopy.footer,
    ]);
  });

  it('échappe le texte reçu au lieu de le rendre tel quel', () => {
    const escaped = renderCodeEmail({
      copy: { ...EmailCopy.signInCode, heading: '<script>alert(1)</script>' },
      code: CODE,
      validityMinutes: 10,
    });

    expect(escaped.html).not.toContain('<script>alert');
    expect(escaped.html).toContain('&lt;script&gt;');
  });
});
