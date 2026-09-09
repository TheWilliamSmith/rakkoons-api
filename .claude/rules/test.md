# Tests

Vitest à tous les niveaux. Aucun test de snapshot.

## Trois niveaux, trois intentions

**Domaine** — tests unitaires purs. Aucun double, aucune infrastructure, aucun conteneur d'injection. On instancie une entité ou un value object et on vérifie ses invariants, y compris les cas où ils doivent être refusés.

Chaque règle métier a un test qui la vérifie et un test qui vérifie qu'elle est bien refusée quand elle est violée.

**Application** — un cas d'usage à la fois, avec des implémentations en mémoire des ports. Des **implémentations réelles mais simplifiées**, pas des mocks : un repository en mémoire qui stocke dans une carte, une horloge figée, un hacheur trivial.

On teste le comportement observable du cas d'usage, jamais le nombre d'appels à une dépendance, sauf quand l'absence d'appel est elle-même une garantie de sécurité.

**Intégration et bout en bout** — contre une vraie base PostgreSQL, jamais contre un client Prisma moqué. Un repository se teste en écrivant puis en relisant. Une route se teste en émettant une vraie requête HTTP.

Chaque test d'intégration part d'un état de base propre et ne dépend d'aucun autre test.

## Ce qu'il faut tester en priorité

Les tests de sécurité passent avant les tests de confort. Pour chaque ressource appartenant à un utilisateur, il existe un test qui vérifie qu'un autre utilisateur ne peut ni la lire, ni la modifier, ni la supprimer, et que la réponse obtenue est indiscernable de celle d'une ressource inexistante.

Pour chaque route d'authentification, il existe un test qui vérifie qu'un échec ne révèle pas l'existence d'un compte.

Ces tests ne sont jamais supprimés ni assouplis pour faire passer une suite.

## Style

Un test par comportement, nommé en français, décrivant ce que le système fait et non la méthode appelée.

Aucune assertion sur un détail d'implémentation : structure interne d'un objet, ordre des appels, forme d'une requête SQL.

Aucun délai réel, aucune attente arbitraire. L'horloge est un port, on la contrôle.

Les données de test sont construites par des fabriques dédiées, avec des valeurs par défaut valides et une surcharge ponctuelle des champs qui comptent pour le test.
