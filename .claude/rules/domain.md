# Domaine

Le cœur métier. C'est la seule couche qui a le droit de contenir des règles.

## Interdits absolus

Aucune importation de NestJS, de Prisma, d'Express, ni d'aucune bibliothèque d'infrastructure. Aucun décorateur. Aucun accès au réseau, au disque, à l'horloge système ou au générateur d'aléa.

Le temps et l'aléa entrent par un port, jamais par un appel direct. Une entité ne fait jamais `new Date()`.

Si un fichier de ce dossier a besoin d'`await`, c'est probablement qu'il est mal placé.

## Contenu

**Entités** — objets identifiés par un identifiant stable, porteurs des invariants du métier. Une entité expose des méthodes qui décrivent des actions du domaine, jamais des accesseurs qui laissent modifier son état de l'extérieur. Ses propriétés sont privées et en lecture seule depuis l'extérieur.

Deux constructions distinctes : une méthode statique de création, qui applique les règles de naissance de l'objet, et une méthode statique de reconstitution, utilisée uniquement par la persistance pour rebâtir un objet déjà valide. Ne les confonds jamais.

**Value objects** — objets sans identité, définis par leur valeur, immuables, valides dès leur construction. Un value object qui peut exister dans un état invalide n'en est pas un.

N'en crée que lorsqu'il y a une règle à protéger. Une adresse e-mail, un montant avec sa devise, une fréquence d'arrosage méritent un value object. Un nom libre sans contrainte n'en mérite pas.

**Erreurs métier** — classes typées, nommées d'après la règle violée, sans statut HTTP et sans message destiné à l'utilisateur. Elles portent au besoin des données structurées permettant à la couche d'exposition de construire une réponse.

**Ports** — interfaces décrivant ce dont le domaine a besoin du monde extérieur : persistance, hachage, horloge, envoi de message. Elles sont déclarées ici et implémentées dans `infrastructure`.

Un port est écrit dans le vocabulaire du domaine, pas dans celui de la technologie. Il parle de retrouver un utilisateur par son adresse, pas d'exécuter une requête.

## Style

Les noms viennent du métier, jamais de la technique. Pas de suffixe `Manager`, `Helper` ou `Util`.

Une méthode qui refuse une opération lève une erreur métier. Elle ne retourne jamais un booléen silencieux ni une valeur nulle pour signaler un échec de règle.

Les collections exposées sont copiées ou figées, jamais rendues modifiables de l'extérieur.
