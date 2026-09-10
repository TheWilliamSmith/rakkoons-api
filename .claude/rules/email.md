# E-mails transactionnels

Les e-mails du produit reprennent le thème défini dans `rakkoons-app/.claude/rules/design.md`, disposition « colonne de tâche » : une colonne centrée, un seul titre, un seul élément affirmé, des filets plutôt que des ombres, le français dans le registre produit.

La référence visuelle reste les écrans d'authentification. Un e-mail n'invente pas un style : il transpose celui de l'app dans les contraintes d'un client de messagerie.

Langue du contenu : français. Langue du code, des fichiers, des variables : anglais.

---

## Portée

Uniquement du transactionnel, déclenché par une action de l'utilisateur :

- code de vérification à l'inscription
- code de connexion
- code de réinitialisation de mot de passe
- plus tard : alerte de sécurité, changement d'adresse

Aucun e-mail marketing, aucune infolettre, aucun contenu promotionnel dans ces gabarits. Pas de lien de désabonnement sur un transactionnel.

---

## Contraintes techniques, non négociables

1. **HTML en tableaux.** Mise en page par `<table role="presentation">`, pas de flex, pas de grid, pas de position.
2. **Styles en ligne.** Chaque déclaration sur l'élément. Un `<style>` en tête est toléré pour `@media` et `:root` de secours, jamais comme seule source d'une règle.
3. **Valeurs hexadécimales en dur.** Les tokens `@theme` n'existent pas ici. Recopie les valeurs littérales de la palette ci-dessous, nulle part ailleurs.
4. **Aucune ressource externe.** Pas de CSS distant, pas de police web requise, pas de script, pas d'image distante décorative. Les rares images sont attachées ou en `data:` et portent un `alt`.
5. **Police système.** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. `Instrument Sans` peut être proposée en amélioration progressive via `@font-face`, mais le rendu juste est la pile système : c'est lui qu'on valide.
6. **Version texte brut obligatoire**, générée à partir du même contenu, jamais à la main séparément.
7. **Largeur fixe 480px**, colonne unique, centrée. Gouttière latérale d'au moins 16px à toute largeur. Lisible et complet à 320px.
8. **Pas de `@media` comme condition de fonctionnement.** Le gabarit est correct sans elle ; elle n'apporte que du confort.
9. Aucun appel à la console, aucun secret ni jeton dans un journal.

Un moteur de gabarit qui compile vers ce HTML de tableaux (MJML par exemple) est autorisé ; justifie la dépendance en une phrase. Les contraintes de sortie s'appliquent quel que soit l'outil.

---

## Palette

Sous-ensemble de la charte, en valeurs littérales.

| Rôle | Valeur | Emploi |
|---|---|---|
| Fond de page | `#f5f7fb` | Le pourtour, derrière la carte |
| Carte | `#ffffff` | Le panneau qui porte le contenu |
| Filet | `#e3e8f3` | Bordure de carte, filet de séparation |
| Texte | `#0c1220` | Titre, corps, le code |
| Texte secondaire | `#55627c` | Chapeau, mention de validité, pied |
| Accent | `#c2410c` | Le point du logo, le fond d'un bouton unique. Rien d'autre |
| Lien | `#9a3412` | Texte d'un lien, souligné. `#c2410c` ne passe pas 4,5:1 en corps de texte |
| Fond du bloc de code | `#f5f7fb` | La pastille qui isole le code |

`#c2410c` ne colore jamais un texte de corps, un titre, un filet. Aucune autre couleur. Aucun dégradé. Aucune ombre. Aucune couleur d'alerte tant qu'un e-mail d'alerte n'existe pas.

---

## Typographie

Une seule famille. Tailles en pixels, les `rem` ne sont pas fiables en messagerie.

| Rôle | Taille | Interligne | Graisse | Emploi |
|---|---|---|---|---|
| Titre | `30px` | `1.16` | `600` | Un seul `<h1>` par e-mail |
| Chapeau | `19px` | `1.6` | `400` | Une phrase sous le titre |
| Corps | `16px` | `1.7` | `400` | Texte courant. Volontairement plus grand que l'app, un e-mail se lit plus loin |
| Mention | `14px` | `1.6` | `400` | Validité, pied de page |
| Code | `32px` | `1` | `600` | Les six chiffres, interlettrage `0.3em` |

Le titre porte un interlettrage `-0.02em`. Le corps est plafonné à `40em` de large, ce qui tient dans les 480px. Pas d'italique, pas de capitales espacées, aucun mot du titre coloré ou mis en gras pour accentuer.

---

## Gabarit

Structure verticale, du haut vers le bas. Espacements pris dans l'échelle `8 / 16 / 24 / 32`.

1. **Pré-en-tête.** Texte de prévisualisation masqué, une phrase, différente de l'objet. Ne répète pas le code.
2. **Logo.** Le mot « Rakkoons » à `18px`, graisse `600`, précédé d'un disque `10px` en `#c2410c` rendu par une cellule de tableau colorée, pas une image. Centré. `32px` sous le bord de la carte.
3. **Titre.** `<h1>` centré, `30px`, `#0c1220`. `24px` sous le logo.
4. **Chapeau.** Une phrase, `#55627c`, centré. `8px` sous le titre.
5. **Bloc de code.** Voir section dédiée. `32px` au-dessus et en dessous.
6. **Validité.** Une ligne `14px`, `#55627c` : « Ce code expire dans dix minutes. » Le délai vient du back, pas d'une valeur écrite dans le gabarit.
7. **Filet.** 1px `#e3e8f3`, pleine largeur, `24px` de marge verticale.
8. **Pied.** `14px`, `#55627c` : « Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. » Rien d'autre. Pas de lien social, pas de « voir dans le navigateur », pas de désabonnement.

La carte : fond `#ffffff`, rayon `20px`, bordure 1px `#e3e8f3`, remplissage `32px`, `24px` sur mobile. Aucune ombre. Un seul élément affirmé sur toute la page : le bloc de code.

---

## Le bloc de code

- Les six chiffres en texte réel sélectionnable, jamais une image.
- `32px`, graisse `600`, `#0c1220`, interlettrage `0.3em`, centré.
- Posés dans une pastille `#f5f7fb`, rayon `8px`, remplissage `16px`, centrée dans la carte.
- Pas de bouton, pas de lien. Le code se recopie à la main.
- **Le code n'apparaît jamais dans une URL**, ni dans un lien « vérifier », ni dans un paramètre de suivi, ni dans un pixel. Un proxy ou un préchargement le consommerait. La vérification côté app ne transporte que le code, portée par un cookie serveur ; l'e-mail respecte la même frontière.
- Pour les lecteurs d'écran, double le code d'un libellé accessible qui épelle les chiffres séparés par une espace.

---

## Liens et boutons

Les e-mails de code n'ont ni bouton ni lien. Si un futur e-mail en a besoin :

- **Lien** : texte souligné en `#9a3412`. Pas de flèche collée au libellé.
- **Bouton** : un seul par e-mail, fond `#c2410c`, texte `#ffffff`, rayon `8px`, remplissage `12px 20px`, texte `16px` graisse `500`. Repli VML pour Outlook. Aucune ombre, aucun dégradé.
- Jamais un bouton et un lien qui font la même chose.

---

## Contenu

Le texte de chaque e-mail vit dans un module de contenu unique du back, comme `content/` dans l'app. Aucune chaîne affichée codée dans un gabarit.

- Français, phrases courtes, ton direct, aucun superlatif, aucune formule promotionnelle.
- **Non-divulgation.** Un e-mail déclenché par une adresse potentiellement inconnue reprend la formulation de l'app : « Si un compte existe pour cette adresse, un code à six chiffres vient d'y être envoyé. »
- **Objet** : court, sans emoji, sans point final, sans le code. Exemple : « Votre code de connexion Rakkoons ».
- Ne reformule jamais une chaîne validée. Si une chaîne paraît mauvaise, signale-le, ne la corrige pas.

---

## Sécurité

- Aucun jeton, aucun identifiant de session, aucun secret dans le corps ni dans une URL de l'e-mail.
- La durée de validité est affichée et vient de la logique serveur.
- Aucun pixel de suivi, aucun suivi d'ouverture lié à une donnée personnelle. Si l'ESP active un suivi par défaut, désactive-le pour ces envois.
- Images distantes interdites : une image distante révèle l'ouverture et l'adresse IP.
- `From` sur un domaine réel, SPF, DKIM et DMARC alignés. Un e-mail de code qui tombe en indésirable ne remplit pas sa fonction.
- Aucune valeur de formulaire, aucun corps de requête, aucun code dans un journal applicatif.

---

## Accessibilité

- `<!DOCTYPE html>`, `<html lang="fr">`, un seul `<h1>`, hiérarchie de titres sans saut.
- Texte réel partout, y compris le code et le logo. La seule image tolérée, si elle existe un jour, porte un `alt`.
- Contraste minimum 4,5:1 : `#55627c` sur `#ffffff` vaut 4,6:1, `#0c1220` sur `#ffffff` est large. `#c2410c` en texte de corps échoue, d'où `#9a3412` pour les liens.
- `prefers-color-scheme` : déclare des couleurs explicites sur chaque bloc pour qu'un client en thème sombre n'inverse pas le contenu de façon illisible. Ne dépends pas d'un mode sombre dédié.
- Utilisable à partir de 320px.

---

## Rendu à vérifier avant livraison

Rendu réel, pas une prévisualisation :

- Gmail web, iOS, Android
- Apple Mail macOS et iOS
- Outlook Windows, Microsoft 365, Outlook web
- Version texte brut seule
- Images désactivées
- Thème sombre sur au moins un client
- Largeur 320px

---

## Ce qui ne doit jamais apparaître

- Une ombre, une élévation, une carte flottante
- Un dégradé, décoratif ou non
- Une image de héros, une illustration, une bannière
- Une étiquette en capitales espacées
- Plusieurs appels à l'action
- Une rangée d'icônes de réseaux sociaux
- Le code dans un lien ou une URL
- Un pixel ou une image distante
- Un lien de désabonnement sur un e-mail de code
