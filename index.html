# Guide : mettre le site du Club MPGT en ligne

Ce guide suppose que vous n'avez jamais codé. Suivez les étapes dans l'ordre,
sans en sauter. Comptez environ 45 minutes la première fois.

Vous allez utiliser 3 services **gratuits** :
- **GitHub** : pour héberger le code
- **Supabase** : la vraie base de données (remplace le stockage temporaire)
- **Vercel** : pour publier le site sur internet

---

## Étape 1 — Créer un compte GitHub

1. Allez sur https://github.com et créez un compte gratuit.
2. Cliquez sur le bouton vert **"New"** pour créer un nouveau dépôt ("repository").
3. Nommez-le `club-mpgt-site`, laissez-le en **Public** ou **Private** (peu importe), ne cochez rien d'autre, cliquez **Create repository**.
4. Sur la page qui s'ouvre, cliquez sur **"uploading an existing file"**.
5. Ouvrez le dossier `club-mpgt-site` que je vous ai fourni sur votre ordinateur, sélectionnez **tous les fichiers et dossiers** (sauf `node_modules` s'il existe — il ne devrait pas y en avoir dans ce que vous avez reçu), glissez-les dans la page GitHub.
6. Cliquez **Commit changes**. Votre code est maintenant en ligne sur GitHub.

---

## Étape 2 — Créer la base de données sur Supabase

1. Allez sur https://supabase.com, créez un compte gratuit (vous pouvez vous connecter avec GitHub).
2. Cliquez **New project**. Donnez-lui un nom (`club-mpgt`), choisissez un mot de passe pour la base (notez-le quelque part), choisissez une région proche de vous, cliquez **Create new project**. Attendez 1-2 minutes.
3. Une fois le projet prêt, allez dans le menu de gauche **SQL Editor** → **New query**.
4. Ouvrez le fichier `supabase-setup.sql` fourni avec le projet, copiez tout son contenu, collez-le dans l'éditeur, cliquez **Run**. Vous devriez voir "Success".
5. Allez dans **Project Settings** (icône engrenage) → **API**. Vous y trouverez deux informations à garder de côté :
   - **Project URL** (commence par `https://...supabase.co`)
   - **anon public key** (une longue suite de caractères)

---

## Étape 3 — Publier le site sur Vercel

1. Allez sur https://vercel.com, créez un compte gratuit en vous connectant avec **GitHub**.
2. Cliquez **Add New** → **Project**.
3. Choisissez le dépôt `club-mpgt-site` que vous avez créé à l'étape 1, cliquez **Import**.
4. Vercel détecte automatiquement qu'il s'agit d'un projet Vite — ne changez rien aux réglages de build.
5. Ouvrez la section **Environment Variables** et ajoutez ces trois lignes (une par une, avec **Add**) :

   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | l'URL notée à l'étape 2 |
   | `VITE_SUPABASE_ANON_KEY` | la clé "anon public" notée à l'étape 2 |
   | `VITE_ADMIN_PASSWORD` | le mot de passe que vous voulez pour l'espace responsables |

6. Cliquez **Deploy**. Après 1 à 2 minutes, Vercel vous donne une adresse du type `club-mpgt-site.vercel.app` — votre site est en ligne et accessible à tout le monde !

---

## Étape 4 — (Optionnel) Utiliser votre propre nom de domaine

Si vous achetez un nom de domaine (ex : `clubmpgt-iscae.com`) chez un registrar
(Namecheap, OVH, Google Domains…), allez dans Vercel → votre projet → **Settings**
→ **Domains**, ajoutez votre domaine, puis suivez les instructions affichées pour
modifier les DNS chez votre registrar. Vercel s'occupe automatiquement du certificat
de sécurité (https).

---

## Mettre à jour le site plus tard

Toute modification de contenu (textes, activités, etc.) se fait en éditant les
fichiers dans le dossier `src/`, puis en les ré-uploadant sur GitHub (Étape 1,
point 5) — Vercel republie automatiquement le site à chaque mise à jour sur GitHub.

Pour un vrai confort de mise à jour au quotidien, demandez à votre designer ou
à un développeur d'installer **Git** et **VS Code** sur votre ordinateur : cela
rend les mises à jour plus rapides, mais n'est pas obligatoire pour commencer.

---

## Questions fréquentes

**Le mot de passe de l'espace responsables est-il sécurisé ?**
C'est un mot de passe simple, suffisant pour un club étudiant, mais visible dans
le code si quelqu'un cherche vraiment. Pour un vrai système de comptes avec
plusieurs responsables et une sécurité renforcée, un développeur pourra brancher
l'authentification intégrée de Supabase plus tard, sans changer le reste du site.

**Puis-je changer les textes (activités, réseaux sociaux, etc.) ?**
Oui, ce sont des textes "en dur" dans `src/App.jsx`, faciles à repérer et à
remplacer (recherchez le mot que vous voulez changer dans le fichier).

**Que se passe-t-il si Supabase ou Vercel deviennent payants ?**
Les deux ont un plan gratuit largement suffisant pour un site de club étudiant
(quelques milliers de visites et de contributions par mois). Vous serez averti
bien avant toute limite.
