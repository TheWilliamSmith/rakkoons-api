# Schéma et migrations

## Conventions

Modèles au singulier en PascalCase, champs en camelCase, tables et colonnes physiques en snake_case via les directives de correspondance.

Identifiants en UUID générés par l'application, jamais des entiers auto-incrémentés. Aucun identifiant séquentiel exposé dans une URL.

Toute table portant des données d'utilisateur possède une clé étrangère vers l'utilisateur propriétaire, indexée et non nulle.

Horodatages de création et de mise à jour sur chaque table.

Les énumérations métier sont des types énumérés en base, pas des chaînes libres.

Les montants monétaires sont stockés en entier dans la plus petite unité, avec une colonne de devise. Jamais en nombre flottant.

## Migrations

Chaque changement de schéma produit une migration versionnée dans le même lot de travail. Jamais de synchronisation directe sur une base autre que locale.

Une migration déjà appliquée n'est jamais éditée. Une correction est une nouvelle migration.

Une migration qui supprime ou renomme une colonne est signalée explicitement au moment de la revue, avec la stratégie de reprise des données.

Toute colonne servant de filtre, de tri ou de clé étrangère est indexée dans la même migration que sa création.

Les contraintes d'unicité métier sont posées en base, pas seulement vérifiées en code.

## Portée

Ce dossier ne contient que le schéma, les migrations et les jeux de données de départ. Aucune logique applicative.

Les types générés par Prisma ne sont importés que dans les dossiers `infrastructure`. Une importation de ces types ailleurs est une violation de l'architecture.
