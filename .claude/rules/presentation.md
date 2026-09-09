# Exposition

La frontière HTTP. C'est le seul endroit du projet qui connaît les verbes, les statuts et les en-têtes.

## Contrôleurs

Un contrôleur est mince : la validation a déjà été faite par le pipe, il appelle un cas d'usage, il transforme le résultat en DTO de réponse. Trois lignes de corps de méthode sont la norme.

Une route appelle un seul cas d'usage. Si une route en enchaîne deux, c'est qu'il manque un cas d'usage.

Aucune logique conditionnelle métier dans un contrôleur. Aucun accès à un repository. Aucun accès à Prisma.

## DTOs

**Entrée** — classes décorées avec les règles de validation, une par route. Le pipe de validation global est configuré pour transformer les valeurs, rejeter les propriétés non déclarées et refuser les conversions implicites.

**Sortie** — types explicites décrivant exactement ce que l'API retourne. Une entité de domaine n'est jamais sérialisée directement, un modèle Prisma non plus. Ajouter un champ en base ne doit jamais exposer ce champ par accident.

## Erreurs

Un filtre d'exception global traduit les erreurs métier en réponses HTTP. C'est le seul fichier qui associe une erreur du domaine à un statut.

Chaque réponse d'erreur contient un code stable, en majuscules, destiné au front, et aucun message destiné à l'utilisateur final : le front possède les textes.

Une erreur inattendue retourne un statut générique, sans trace, sans nom de table, sans détail d'implémentation.

Une ressource inexistante et une ressource appartenant à un autre utilisateur retournent exactement la même réponse.

## Authentification et autorisation

L'identité de l'appelant est extraite par un guard et mise à disposition sous une forme typée. Un contrôleur ne lit jamais un en-tête d'autorisation lui-même.

L'identifiant du propriétaire transmis au cas d'usage vient **toujours** de la session authentifiée, jamais du corps ni des paramètres de la requête. Un identifiant de propriétaire accepté depuis l'entrée utilisateur est une faille.

## Limitation de débit

Appliquée sur toute route d'authentification, de réinitialisation et de renvoi d'e-mail, avec des seuils déclarés en configuration et non en dur.
