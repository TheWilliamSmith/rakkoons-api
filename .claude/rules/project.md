# Rakkoons API

API du SaaS personnel Rakkoons, qui regroupe plusieurs outils du quotidien dans un seul espace : finances, plantes, garde-robe, santé, tâches. Chaque utilisateur active uniquement les outils qui lui servent, et ne voit jamais que ses propres données.

Dépôt séparé du front. Aucune dépendance partagée entre les deux pour l'instant : le contrat entre eux est l'API HTTP.

Produit construit et relu par une seule personne. Chaque livraison est relue ligne par ligne. La lisibilité prime sur la vitesse.

Langue du code, des fichiers, des variables et des commits : anglais.
Langue des messages destinés à l'utilisateur final : le back retourne des codes d'erreur, jamais des phrases. Le front décide du texte.

---

## Stack

- NestJS, TypeScript strict
- Prisma, PostgreSQL
- Vitest pour tous les niveaux de test
- `argon2` pour le hachage des mots de passe
- `class-validator` et `class-transformer` à la frontière HTTP uniquement

N'ajoute aucune dépendance sans la justifier en une phrase et attendre validation.

---

## Architecture

Architecture en couches, orientée domaine, découpée par contexte fonctionnel.

```
src/
  modules/
    <contexte>/
      domain/          entités, value objects, erreurs métier, ports
      application/     cas d'usage, DTOs applicatifs
      infrastructure/  implémentations Prisma, adaptateurs externes
      presentation/    contrôleurs, DTOs HTTP, guards
  shared/
    domain/            primitives métier communes
    infrastructure/    client Prisma, configuration, filtres d'exception
prisma/                schéma et migrations
test/                  tests d'intégration et de bout en bout
```

Chaque dossier de couche a son propre `CLAUDE.md`. Lis-le avant d'y travailler.

### La règle de dépendance

Les dépendances pointent toujours vers l'intérieur.

```
presentation → application → domain
infrastructure → domain
```

- `domain` ne dépend de rien. Ni de Nest, ni de Prisma, ni d'HTTP.
- `application` dépend de `domain` uniquement.
- `infrastructure` implémente les interfaces déclarées dans `domain`.
- `presentation` appelle `application` et ne connaît pas `infrastructure`.

Une importation qui viole ce sens est une erreur, pas un raccourci. Si tu penses en avoir besoin, arrête-toi et demande.

### Calibrage honnête

Le DDD strict s'applique aux contextes qui portent une vraie logique métier : l'authentification et les comptes, la finance.

Pour un contexte qui est honnêtement du CRUD sans invariant, un module Nest classique avec un service et un repository est acceptable, à condition que ce soit **une décision explicite écrite dans le `CLAUDE.md` du module**, et que la règle d'isolation par utilisateur reste appliquée au niveau du repository.

N'invente pas des value objects pour envelopper une chaîne qui n'a aucune règle. La complexité doit être justifiée par une invariance à protéger.

---

## Règles de code non négociables

1. **Aucun commentaire.** Ni `//`, ni `/* */`, ni JSDoc, ni TODO. Un bout de code qui aurait besoin d'un commentaire doit être renommé ou extrait jusqu'à se lire seul.
2. **Aucune duplication.** Deux blocs de logique similaires deviennent une fonction ou une classe partagée.
3. **TypeScript strict.** Aucun `any`, aucun `@ts-ignore`, aucun cast non justifié. Les retours de fonction publique sont typés explicitement.
4. **Aucun appel à la console.** La journalisation passe par le logger injecté.
5. **Une classe fait une seule chose.** Un fichier par classe. Un fichier de plus de 150 lignes en contient probablement deux.
6. **Aucune valeur magique.** Durées, limites, tailles et seuils sont des constantes nommées ou de la configuration.
7. **Aucun accès direct à `process.env` hors du module de configuration.**

---

## Sécurité

Ces règles s'appliquent à toute fonctionnalité, pas seulement à l'authentification.

- **Isolation par propriétaire.** Toute requête de lecture ou d'écriture sur une ressource appartenant à un utilisateur est filtrée par l'identifiant de cet utilisateur **dans la clause de requête elle-même**, jamais par une vérification faite après la lecture. Une ressource qui n'appartient pas à l'appelant doit être indiscernable d'une ressource inexistante.
- **Aucune énumération.** Une ressource inexistante et une ressource interdite retournent le même statut et le même code d'erreur.
- **Validation à la frontière.** Toute entrée HTTP est validée et nettoyée avant d'atteindre la couche application. Les propriétés non déclarées sont rejetées, pas ignorées.
- **Aucun secret, jeton, mot de passe ou en-tête d'autorisation dans un journal**, à aucun niveau, y compris en développement.
- **Mots de passe hachés avec argon2id**, jamais chiffrés, jamais comparés autrement que par la fonction de vérification dédiée.
- **Exigences de mot de passe : longueur minimale de douze caractères et composition** : au moins une majuscule, une minuscule, un chiffre et un caractère spécial. La même politique s'applique à toute route qui pose un mot de passe, inscription comme réinitialisation.
- **Aucune donnée sensible dans une URL**, ni en chemin, ni en paramètre de requête. Un code, un jeton ou une adresse voyagent dans le corps ou dans un cookie.
- **Jetons opaques et aléatoires**, stockés hachés, à usage unique et à durée courte pour tout ce qui circule par e-mail.
- **Limitation de débit** sur toute route d'authentification, de réinitialisation et de renvoi d'e-mail.
- **Aucune entité de domaine ni modèle de persistance retourné tel quel dans une réponse HTTP.** Une réponse est toujours un DTO explicite.
- **Réinitialiser un mot de passe invalide toutes les sessions ouvertes** de l'utilisateur.

---

## Gestion des erreurs

Le domaine et l'application lèvent des erreurs métier typées, sans statut HTTP et sans message destiné à l'utilisateur.

Un filtre d'exception global les traduit en réponses HTTP avec un code d'erreur stable et documenté. C'est le seul endroit du projet qui connaît les statuts HTTP.

Une erreur inattendue retourne un statut générique et ne fuit jamais de détail d'implémentation, de trace, ni de nom de table.

---

## Base de données

- Chaque migration est générée par Prisma et versionnée. Aucune migration n'est éditée à la main après avoir été appliquée.
- Aucune modification de schéma sans migration correspondante dans le même lot.
- Toute colonne servant de filtre ou de clé étrangère est indexée.
- Les identifiants sont des UUID générés par l'application, jamais des entiers auto-incrémentés exposés.
- Les suppressions de données utilisateur sont réelles, pas logiques, sauf décision contraire explicite.

---

## Tests

Trois niveaux, tous en Vitest. Le détail est dans `test/CLAUDE.md`.

- **Domaine** : tests unitaires purs, sans double, sans infrastructure.
- **Application** : cas d'usage testés avec des implémentations en mémoire des ports, pas des mocks.
- **Infrastructure et HTTP** : tests d'intégration contre une vraie base PostgreSQL.

Aucun test ne moque le client Prisma. Aucun test de snapshot.

---

## Protocole de travail

Toute fonctionnalité se construit en trois phases avec deux points d'arrêt obligatoires.

**Phase 1, domaine** — entités, value objects, erreurs métier, ports, cas d'usage, avec leurs tests unitaires. Aucune infrastructure, aucune route. Arrêt : affiche les fichiers créés et le résultat des tests, attends validation.

**Phase 2, infrastructure** — schéma Prisma, migration, repositories, adaptateurs, avec leurs tests d'intégration. Arrêt : affiche le schéma, la migration et les tests, attends validation.

**Phase 3, exposition** — contrôleurs, DTOs HTTP, guards, filtre d'exception, tests de bout en bout, documentation des routes.

Ne franchis jamais un point d'arrêt de ta propre initiative.

---

## Définition de terminé

Le build, la vérification de types, la suite de tests et le linter passent sans avertissement.

Puis ces contrôles, à faire et à rapporter :

- Aucun `//` ni `/*` dans le code source
- Aucune importation violant la règle de dépendance
- Aucun type Prisma importé hors de `infrastructure` et `prisma`
- Aucun appel à la console
- Toute requête sur une ressource utilisateur porte un filtre de propriétaire dans sa clause
- Aucune entité de domaine sérialisée directement dans une réponse

---

## Communication

Pas de résumé enthousiaste. Pas de liste de ce que tu viens de faire si le code le montre déjà.

Si tu t'écartes de la spécification, dis-le en une phrase avec la raison. Si une instruction est ambiguë ou entre en conflit avec le code existant, demande avant de coder. Si une instruction te paraît techniquement mauvaise, dis-le avant de l'appliquer.
