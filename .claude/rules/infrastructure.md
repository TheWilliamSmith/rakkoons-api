# Infrastructure

Les implémentations concrètes des ports déclarés dans le domaine. Cette couche est remplaçable : c'est son seul intérêt.

## Repositories

Un repository implémente une interface du domaine et rien d'autre. Il ne définit aucune méthode publique qui ne figure pas dans son port.

Il reçoit et retourne des objets du domaine. Le modèle de persistance ne sort jamais d'ici.

**Isolation par propriétaire.** Toute méthode qui touche une ressource appartenant à un utilisateur prend l'identifiant du propriétaire en paramètre et l'inclut dans la clause de requête. Jamais un chargement suivi d'une vérification en mémoire. Une ressource appartenant à quelqu'un d'autre doit être introuvable, pas interdite.

Aucune règle métier ici. Un repository qui contient une condition exprimant une contrainte du produit est un repository mal placé.

## Mappers

Un mapper par agrégat, avec deux directions explicites : du modèle de persistance vers le domaine, et du domaine vers le modèle de persistance.

La reconstruction d'une entité depuis la base passe par sa méthode statique de reconstitution, jamais par sa méthode de création : les données stockées sont déjà valides et ne doivent pas repasser par les règles de naissance.

## Adaptateurs externes

Hachage, génération de jetons, horloge, envoi d'e-mail, stockage de fichiers. Chacun implémente un port du domaine.

Un adaptateur ne prend aucune décision. Il traduit un appel du domaine vers une bibliothèque, et traduit les erreurs de cette bibliothèque en erreurs du domaine.

## Prisma

Le client est un service partagé, injecté, jamais instancié dans un repository.

Les requêtes sélectionnent explicitement les champs nécessaires. Pas de sélection implicite de toutes les colonnes sur les tables portant des données sensibles.

Les transactions sont exposées par un port d'unité de travail consommé par la couche application. Un repository n'ouvre jamais de transaction de sa propre initiative.

Aucune requête brute sans justification écrite dans le message de commit, et jamais construite par concaténation de chaînes.
