# Approbin

Application web (PWA) de révision : fiches de cours organisées par matière/chapitre, quiz avec répétition espacée, statistiques et calendrier de révision.

## Stack technique

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router
- TanStack Query
- Supabase (authentification, base de données Postgres, stockage de fichiers)
- jsPDF + html2canvas (export PDF des fiches)
- vite-plugin-pwa (installation sur mobile, fonctionnement hors-ligne du shell applicatif)

## Fonctionnalités

- **Fiches** : matières → chapitres → fiches, renommables et supprimables. Une fiche peut être rédigée manuellement ou créée par import d'un document (PDF, image, etc.). Export PDF pour les fiches manuelles.
- **Questions** : création manuelle de questions/réponses par chapitre, et quiz avec répétition espacée :
  - **Échoué** → la question revient 5 minutes plus tard, dans la même session.
  - **En apprentissage** → la question revient le lendemain.
  - **Validé** → paliers progressifs 3 → 5 → 7 → 14 → 21 → 30 → 45 jours (le palier se réinitialise en cas d'échec).
- **Statistiques** : taux et nombre de réponses validées / en apprentissage / échouées, par matière, par chapitre et par jour.
- **Calendrier** : vue mensuelle des questions programmées, colorée selon leur statut.
- **Rappel quotidien Telegram** (optionnel) : message envoyé automatiquement à 18h à chaque utilisateur ayant lié son compte, s'il a des questions à réviser ce jour-là. Voir la section dédiée ci-dessous.
- **Panneau admin** (optionnel) : consultation en lecture seule des données de n'importe quel utilisateur (utile pour du support), réservée aux comptes explicitement désignés admin. Voir la section dédiée ci-dessous.

## Configuration (Supabase)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans le **SQL Editor** du projet, exécutez le contenu de `supabase/migrations/0001_init.sql`. Ce script crée les tables (`subjects`, `chapters`, `sheets`, `questions`, `question_reviews`, `quiz_answers`), active la Row Level Security (chaque utilisateur ne voit que ses propres données) et crée le bucket de stockage `sheets` pour les fichiers importés.
   Exécutez aussi `supabase/migrations/0002_telegram_reminders.sql` (table de liaison Telegram) — nécessaire même si vous n'activez pas les rappels tout de suite. `0003_schedule_reminders.sql` est à exécuter plus tard, une fois le rappel Telegram configuré (voir plus bas). `0004_admin.sql` est à exécuter si vous voulez activer le panneau admin (voir plus bas), sinon vous pouvez l'ignorer.
3. Dans **Project Settings → API**, récupérez `Project URL` et la clé `anon public`.
4. Copiez `.env.example` vers `.env` et renseignez ces deux valeurs :

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. (Optionnel) Dans **Authentication → Providers**, désactivez la confirmation par email si vous voulez pouvoir vous connecter immédiatement après inscription en développement.

## Rappel quotidien Telegram (optionnel)

Chaque utilisateur reçoit un message Telegram à 18h s'il a des questions à réviser ce jour-là. Fonctionnalité 100% gratuite, sans limite d'envoi. Mise en place en 6 étapes, à faire une seule fois pour toute l'application (chaque utilisateur lie ensuite son propre compte depuis Paramètres) :

### 1. Créer le bot Telegram

1. Ouvrez Telegram, cherchez **@BotFather** et démarrez une conversation.
2. Envoyez `/newbot`, choisissez un nom (ex: "Approbin Rappels") puis un nom d'utilisateur se terminant par `bot` (ex: `ApprobinRappels_bot`).
3. BotFather vous donne un **jeton** (token), du type `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Gardez-le secret.

### 2. Déployer les deux Edge Functions

Dans le dashboard Supabase → **Edge Functions** → **New function** :

- Créez une fonction nommée `telegram-webhook`, collez le contenu de `supabase/functions/telegram-webhook/index.ts`, déployez.
- Créez une fonction nommée `send-daily-reminders`, collez le contenu de `supabase/functions/send-daily-reminders/index.ts`, déployez.

### 3. Configurer les secrets des fonctions

Dans **Edge Functions → Secrets** (ou **Manage secrets**), ajoutez :

- `TELEGRAM_BOT_TOKEN` = le jeton obtenu à l'étape 1
- `TELEGRAM_WEBHOOK_SECRET` = une chaîne aléatoire de votre choix (ex: générée sur [1Password](https://1password.com/password-generator) ou simplement une phrase longue) — sert à vérifier que les requêtes viennent bien de Telegram
- `APP_URL` (optionnel) = l'URL de votre app déployée (ex: `https://approbin.vercel.app`), ajoutée dans le message de rappel

### 4. Activer le webhook Telegram

Dans un navigateur, ouvrez cette URL (remplacez les valeurs) pour indiquer à Telegram où envoyer les messages reçus par le bot :

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Une réponse `{"ok":true,...}` confirme que c'est bien configuré.

### 5. Planifier l'envoi quotidien

Activez les extensions **pg_cron** et **pg_net** : Dashboard → **Database → Extensions**, recherchez-les et activez-les.

Ouvrez `supabase/migrations/0003_schedule_reminders.sql`, remplacez `<PROJECT_REF>` et `<SERVICE_ROLE_KEY>` (trouvable dans **Project Settings → API**) par vos valeurs, puis exécutez le script dans le SQL Editor. Il planifie l'appel de `send-daily-reminders` chaque jour à 18h (heure de Paris — pensez à ajuster l'heure UTC de 1h lors du changement d'heure d'été/hiver, voir les commentaires dans le fichier).

### 6. Configurer le frontend

Ajoutez dans `.env` (et dans les variables d'environnement Vercel) :

```
VITE_TELEGRAM_BOT_USERNAME=ApprobinRappels_bot
```

(le nom d'utilisateur du bot choisi à l'étape 1, **sans** le `@`).

### Utilisation

Chaque utilisateur va dans **Paramètres** dans l'app, clique sur **Lier Telegram**, puis **Ouvrir Telegram** (ou envoie manuellement le code affiché au bot). Une fois lié, il reçoit le rappel quotidien automatiquement et peut le désactiver avec `/stop` envoyé au bot, ou depuis la page Paramètres.

## Panneau admin (optionnel)

Permet de consulter en **lecture seule** les données de n'importe quel utilisateur (matières, chapitres, nombre de fiches/questions, statistiques de quizz) — utile pour diagnostiquer un problème signalé par un utilisateur. Aucune modification n'est possible depuis cet écran.

1. Dans le **SQL Editor**, exécutez `supabase/migrations/0004_admin.sql`.
2. Tout en bas du fichier, une requête en commentaire vous permet de vous rendre admin **avec votre compte Approbin existant** (pas de compte séparé à créer) :

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'votre-email@exemple.com';
   ```

   Remplacez `votre-email@exemple.com` par l'email de votre compte, puis exécutez cette requête seule dans le SQL Editor.
3. Reconnectez-vous à l'app (ou rafraîchissez la page) : un lien **Admin** apparaît dans le menu.
4. Depuis cet écran, recherchez un utilisateur par email pour voir ses matières/chapitres et ses statistiques.

Pour ajouter un autre admin plus tard, relancez la même requête `insert` avec son email.

## Développement

```bash
npm install
npm run dev
```

## Build de production

```bash
npm run build
npm run preview
```

Le build génère une PWA installable (`manifest.webmanifest`, service worker). Sur mobile, ouvrez le site déployé dans le navigateur puis « Ajouter à l'écran d'accueil ».

## Prochaines étapes possibles

- Génération de questions par IA à partir d'un cours scanné (OCR + IA), non incluse dans cette v1.
- Édition riche (markdown rendu, images) dans les fiches manuelles.
