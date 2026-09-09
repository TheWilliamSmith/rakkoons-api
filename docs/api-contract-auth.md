# Contrat d'API — authentification

Ce que le back doit exposer pour que le front d'authentification fonctionne sans modification ailleurs que dans `lib/auth-client.ts`.

Établi à partir de la frontière réelle : les sept fonctions exportées par `lib/auth-client.ts` et leurs sept appelants. Aucun composant ne connaît la forme d'une requête HTTP, donc ce fichier est le seul contrat à respecter.

---

## 1. Décision structurante : l'état intermédiaire vit côté serveur

Trois appels ne portent **aucune identité** :

```ts
verifySignUpCode({ code })          // quel compte ?
verifyPasswordResetCode({ code })   // quelle adresse ?
resetPassword({ password })         // pour qui ?
```

Ce n'est pas un oubli. Le front ne conserve ni l'adresse, ni le mot de passe, ni un jeton entre deux étapes : rien dans `localStorage`, rien dans `sessionStorage`, rien dans un contexte global. C'est la règle de sécurité qui l'impose.

Le back doit donc porter l'état du parcours en cours dans un **cookie `httpOnly`**, posé par l'étape qui ouvre le parcours et lu par les étapes suivantes.

| Cookie | Posé par | Lu par | Durée |
|---|---|---|---|
| `rk_signup` | `POST /auth/sign-up` | `/auth/sign-up/verify` | 15 min |
| `rk_reset` | `POST /auth/password-reset/request` | `/auth/password-reset/verify`, `/auth/password-reset/complete` | 15 min |
| `rk_session` | `POST /auth/sign-in` | tout le reste du produit | selon politique de session |

Attributs obligatoires sur les trois : `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.

Le cookie ne contient jamais l'adresse ni le mot de passe : uniquement un identifiant opaque et aléatoire qui pointe vers un enregistrement serveur.

> Si tu préfères renvoyer un jeton dans le corps de la réponse, il faudra que le front le stocke entre deux étapes — et cela casse la règle « ni mot de passe ni jeton ne survit à la soumission ». Le cookie est le seul chemin qui la respecte.

---

## 2. Enveloppe commune

**Succès** : tout code `2xx`. Le corps peut être vide ; le front ne lit rien d'autre que le statut, sauf pour la disponibilité d'un nom.

**Échec** : code `4xx` ou `5xx`, avec ce corps exact.

```json
{ "error": { "reason": "invalid-credentials" } }
```

`reason` est la seule valeur que le front consomme. Elle se mappe sur `AuthFailureReason` :

| `reason` | Message affiché | Origine du message |
|---|---|---|
| `invalid-credentials` | Adresse e-mail ou mot de passe incorrect. | `authFailureMessages` |
| `unavailable` | Impossible de traiter votre demande pour le moment. Réessayez dans quelques instants. | `authFailureMessages` |

Toute erreur non prévue, tout `5xx`, tout délai dépassé : le front retombe seul sur `unavailable`. Le back n'a pas à inventer d'autres valeurs sans que ce tableau change d'abord.

> **Une valeur manque aujourd'hui.** `content/auth.ts` contient déjà `verificationCodeRejected` — « Ce code est incorrect ou a expiré. » — mais aucune raison d'échec ne permet de l'afficher. Quand le back arrivera, ajouter `"invalid-code"` à `AuthFailureReason` et le brancher sur ce message. Voir §7.

---

## 3. Les sept points d'entrée

### 3.1 Disponibilité d'un nom d'utilisateur

```http
GET /auth/username-availability?username=rakkoonette
```

**Réponse 200**

```json
{ "isAvailable": true }
```

Appelé **à chaque frappe** dès que le nom passe la validation locale : 3 à 20 caractères, `[a-z0-9_-]`, ne commence ni ne finit par un séparateur. Comparaison insensible à la casse et aux espaces de bord.

Contraintes :

- Limiter le débit par IP. Sans cela, ce point d'entrée devient un énumérateur de comptes.
- Réserver le nom au moment de la création, pas ici. Deux personnes peuvent voir « disponible » simultanément ; c'est `POST /auth/sign-up` qui tranche, sous contrainte d'unicité en base.
- Doit répondre en moins de 200 ms, sinon l'indicateur clignote sous les doigts.

### 3.2 Inscription

```http
POST /auth/sign-up
```

```json
{
  "username": "rakkoonette",
  "email": "william@rakkoons.fr",
  "password": "MotDePasseQuiGagne1!",
  "hasAcceptedTerms": true
}
```

**Réponse 201** — corps vide, et `Set-Cookie: rk_signup=…`

Effets attendus :

- Créer un compte à l'état `pending`, mot de passe haché en argon2id.
- Générer un code à six chiffres, le stocker haché, TTL 10 min, usage unique.
- L'envoyer par e-mail.
- Enregistrer le consentement : date, version des conditions acceptées.

**Échecs** : `409` avec `invalid-credentials` si le nom ou l'adresse est déjà pris. `422` avec `invalid-credentials` si la validation serveur refuse le mot de passe.

Le serveur revalide tout ce que le front valide. La validation cliente est un confort, jamais une garantie : douze caractères minimum, une majuscule, une minuscule, un chiffre, un caractère spécial.

### 3.3 Vérification du code d'inscription

```http
POST /auth/sign-up/verify
Cookie: rk_signup=…
```

```json
{ "code": "429861" }
```

**Réponse 200** — corps vide, `rk_signup` effacé.

Le compte passe de `pending` à `active`. **Aucune session n'est ouverte** : le front affiche « Votre compte est créé » et renvoie vers `/login`. Ne pose pas `rk_session` ici.

**Échecs** : `400` avec `invalid-code` si le code est faux, expiré, déjà consommé, ou si le cookie manque. Un code expiré et un code inexistant renvoient exactement la même chose.

Contraintes : comparaison à temps constant, cinq tentatives maximum par cookie, puis invalidation du parcours.

### 3.4 Connexion

```http
POST /auth/sign-in
```

```json
{ "email": "william@rakkoons.fr", "password": "MotDePasseQuiGagne1!" }
```

**Réponse 200** — corps vide, `Set-Cookie: rk_session=…`

**Échec** : `401` avec `invalid-credentials`, et **rien d'autre**.

Adresse inconnue, mot de passe faux, compte encore `pending`, compte suspendu : même code, même `reason`, même délai de réponse. Toute variation permet d'énumérer les comptes. Hacher un mot de passe factice quand l'adresse est inconnue, pour que la durée ne trahisse rien.

### 3.5 Demande de code de réinitialisation

```http
POST /auth/password-reset/request
```

```json
{ "email": "william@rakkoons.fr" }
```

**Réponse 200 — toujours** — corps vide, `Set-Cookie: rk_reset=…`

Que l'adresse existe ou non. Le front affiche « Si un compte existe pour cette adresse, un code vient d'y être envoyé » et passe à l'étape suivante dans les deux cas. Le cookie est posé même pour une adresse inconnue, sans quoi l'absence de cookie trahirait la non-existence du compte.

Le délai de réponse doit être identique dans les deux cas.

### 3.6 Vérification du code de réinitialisation

```http
POST /auth/password-reset/verify
Cookie: rk_reset=…
```

```json
{ "code": "429861" }
```

**Réponse 200** — corps vide. Le cookie `rk_reset` est **renouvelé** et marqué comme vérifié.

**Échec** : `400` avec `invalid-code`. Mêmes contraintes qu'en 3.3, plus une : sur un parcours ouvert pour une adresse inexistante, tout code échoue, avec le même message et le même délai.

### 3.7 Enregistrement du nouveau mot de passe

```http
POST /auth/password-reset/complete
Cookie: rk_reset=…
```

```json
{ "password": "MotDePasseQuiGagne1!" }
```

**Réponse 200** — corps vide, `rk_reset` effacé.

Effets attendus :

- Remplacer le hachage du mot de passe.
- **Invalider toutes les sessions existantes** de ce compte. Le sous-titre affiché à l'écran le promet : « Il remplacera immédiatement l'ancien sur tous vos appareils. »
- **N'ouvrir aucune session.** Le front affiche « Reconnectez-vous » et renvoie vers `/login`.

**Échecs** : `403` avec `unavailable` si le cookie n'est pas à l'état vérifié. `422` avec `invalid-credentials` si le mot de passe échoue la revalidation serveur.

---

## 4. Ce qu'il faut stocker

| Donnée | Pourquoi |
|---|---|
| `id`, `username`, `email` | Identité. `username` et `email` uniques, insensibles à la casse |
| `passwordHash` | argon2id. Jamais le mot de passe en clair, nulle part, y compris dans les journaux |
| `status` | `pending` ou `active`. Un compte `pending` ne peut pas se connecter |
| `termsAcceptedAt`, `termsVersion` | Preuve du consentement recueilli à l'inscription |
| `createdAt`, `updatedAt` | Traçabilité |

Table séparée pour les parcours en cours :

| Donnée | Pourquoi |
|---|---|
| `id` opaque | Ce que porte le cookie |
| `purpose` | `sign-up` ou `password-reset` |
| `accountId` | Nullable : une demande de réinitialisation pour une adresse inconnue existe quand même |
| `codeHash` | Le code à six chiffres, haché. Jamais en clair |
| `attemptsLeft` | Cinq au départ |
| `isVerified` | Passe à vrai après 3.6, autorise 3.7 |
| `expiresAt` | 15 min pour le parcours, 10 min pour le code |

---

## 5. Contraintes transversales

- **Aucune donnée de formulaire dans une URL.** Tout est en `POST`, sauf la disponibilité d'un nom, qui n'est pas sensible.
- **Aucun secret dans les journaux.** Ni mot de passe, ni code, ni valeur de cookie. Une adresse e-mail dans un journal d'accès est déjà une donnée personnelle : à traiter comme telle.
- **Limitation de débit** par IP et par compte sur 3.2, 3.4, 3.5, et par cookie sur 3.3 et 3.6.
- **CORS** : le front et l'API doivent partager le même site pour que `SameSite=Lax` fonctionne. Sinon il faut `SameSite=None; Secure` et une liste blanche d'origines explicite.
- **CSRF** : `SameSite=Lax` couvre les requêtes `POST` inter-sites. Ajouter un jeton anti-CSRF si un jour une route d'authentification accepte du `GET` mutant, ce qui ne devrait pas arriver.

---

## 6. Ce qui manque encore côté front

Deux points d'entrée n'ont pas d'appelant aujourd'hui, mais en auront :

- **Renvoyer le code.** Le bouton « Renvoyer le code » ramène actuellement à l'étape précédente. Un vrai `POST /auth/sign-up/resend` et son équivalent réinitialisation seront nécessaires, avec un délai minimum entre deux envois.
- **Session et déconnexion.** `GET /auth/session` et `POST /auth/sign-out` seront nécessaires dès qu'une route protégée existera. Hors périmètre tant qu'il n'y a pas de tableau de bord.

---

## 7. Ce qui change dans le front le jour où l'API existe

Un seul fichier, `lib/auth-client.ts`. Les sept fonctions passent de la simulation à `fetch`, avec `credentials: "include"`. Aucun composant, aucun test de composant, aucun contenu ne bouge.

Deux ajustements de types accompagneront le branchement :

```ts
export type AuthFailureReason = "invalid-credentials" | "invalid-code" | "unavailable";
```

et le mappage correspondant dans `authFailureMessages`, où `verificationCodeRejected` attend déjà d'être utilisé.

Les deux fonctions de vérification devront alors renvoyer `invalid-code` plutôt que `unavailable`, et `VerificationCodeForm` affichera le bon message sans changer de structure.
