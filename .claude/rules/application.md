# Application

L'orchestration. Cette couche décide de l'enchaînement, le domaine décide des règles.

## Cas d'usage

Une classe par cas d'usage, nommée d'après l'action métier, avec une seule méthode publique d'exécution. Si une classe a deux méthodes publiques, c'est qu'elle contient deux cas d'usage.

Un cas d'usage reçoit un objet d'entrée typé, retourne un objet de sortie typé, et ne connaît ni HTTP, ni Prisma, ni le format des réponses.

Il dépend uniquement des ports déclarés dans `domain`. Les implémentations lui sont injectées.

## Ce qui n'a rien à faire ici

Aucune règle métier. Si tu écris une condition qui exprime une contrainte du produit, elle appartient à une entité ou à un value object.

Aucun type Prisma, aucun modèle de persistance, aucun objet de requête ou de réponse HTTP.

Aucune construction de message destiné à l'utilisateur.

## Transactions

La frontière transactionnelle est ici, pas dans le repository. Un cas d'usage qui modifie plusieurs agrégats les enveloppe dans une unité de travail exposée par un port.

Un cas d'usage qui ne modifie qu'un seul agrégat n'ouvre pas de transaction explicite.

## Objets d'entrée et de sortie

Types simples, sans décorateur, sans validation. La validation des entrées est faite à la frontière HTTP, la validation des règles est faite dans le domaine.

Un objet de sortie ne contient jamais une entité de domaine. Il contient les données nécessaires à l'appelant, dans des types primitifs ou des structures plates.

## Erreurs

Les erreurs métier levées par le domaine remontent telles quelles. Ne les intercepte pas pour les retraduire, sauf si le cas d'usage a une raison métier de le faire, et dans ce cas lève une erreur métier plus précise.

Ne convertis jamais une erreur en valeur de retour muette.
