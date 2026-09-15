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

## Configuration (Supabase)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans le **SQL Editor** du projet, exécutez le contenu de `supabase/migrations/0001_init.sql`. Ce script crée les tables (`subjects`, `chapters`, `sheets`, `questions`, `question_reviews`, `quiz_answers`), active la Row Level Security (chaque utilisateur ne voit que ses propres données) et crée le bucket de stockage `sheets` pour les fichiers importés.
3. Dans **Project Settings → API**, récupérez `Project URL` et la clé `anon public`.
4. Copiez `.env.example` vers `.env` et renseignez ces deux valeurs :

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. (Optionnel) Dans **Authentication → Providers**, désactivez la confirmation par email si vous voulez pouvoir vous connecter immédiatement après inscription en développement.

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
