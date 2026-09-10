# E-mails

Les messages transactionnels sortent de `infrastructure/messaging`. Ce sont les seules pages du produit que nous ne contrôlons pas au rendu : le client mail décide.

## Contraintes de rendu

Les clients mail ne savent pas lire une variable CSS, ne chargent pas une police web de façon fiable et n'appliquent pas une feuille de style externe.

Donc : valeurs de la charte écrites en dur, styles en ligne, mise en page en tables. Aucune classe, aucun `<style>` porteur de mise en page, aucun `@media` sur lequel on compte.

Une police web est proposée par `<link>` et jamais attendue : la pile de repli système suit immédiatement dans la même déclaration.

Chaque message part en deux versions, HTML et texte brut. La version texte n'est pas un sous-produit : elle porte la même information dans le même ordre.

## Charte

Les valeurs viennent du front. Elles sont recopiées dans un seul fichier de thème et jamais réécrites ailleurs.

| Rôle | Valeur |
| --- | --- |
| Fond externe | `#f5f7fb` |
| Fond de carte | `#ffffff` |
| Bordure et filet | `#e3e8f3` |
| Texte principal | `#0c1220` |
| Texte secondaire | `#55627c` |
| Marque et liens | `#c2410c` |
| Largeur de carte | `400px` |
| Rayon de carte | `20px` |
| Rayon de bloc | `8px` |
| Gouttière interne | `24px` |
| Police | `'Instrument Sans'` puis repli système |

Le rayon n'est pas uniforme : la carte et les blocs qu'elle contient ne portent pas le même.

## Composition

Un seul élément audacieux par message. Dans un message qui porte un code, c'est le bloc du code. Tout le reste est calme.

Ordre vertical : marque, titre, chapeau d'une phrase, élément audacieux, précision de validité, filet, pied.

Le chapeau fait une phrase. Registre produit : aucun superlatif, aucune exclamation.

Un code se recopie, il ne se clique pas. Un message qui porte un code ne porte pas de bouton.

Interdits repris du site : aucun dégradé, aucune étiquette en majuscules espacées, aucune flèche collée à un libellé.

Les liens sont soulignés et portent la couleur de marque.

## Accessibilité

Le contraste du texte secondaire sur le fond de carte est vérifié et ne descend jamais sous 4.5:1.

La couleur n'est jamais le seul signal.

## Portée

Un message transactionnel ne porte pas de lien de désabonnement.

Aucun secret, aucun mot de passe et aucun identifiant de session dans un e-mail. Un code de vérification à durée courte est la seule valeur sensible admise, et elle n'apparaît jamais dans un journal.

Le gabarit ne connaît ni le domaine, ni la configuration : il reçoit des chaînes déjà décidées par l'appelant.
