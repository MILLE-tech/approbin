-- Approbin - schéma initial
-- À exécuter dans le SQL Editor de votre projet Supabase (ou via `supabase db push`).

create extension if not exists "pgcrypto";

-- ========== MATIÈRES ==========
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ========== CHAPITRES ==========
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ========== FICHES DE RÉVISION ==========
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,                          -- contenu rédigé manuellement (markdown)
  source_type text not null default 'manual' check (source_type in ('manual', 'import')),
  file_path text,                        -- chemin dans le bucket de stockage 'sheets' si fichier importé
  file_name text,
  file_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== QUESTIONS DE QUIZ ==========
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

-- ========== ÉTAT DE RÉPÉTITION ESPACÉE (1 ligne par question) ==========
create table if not exists public.question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'nouveau' check (status in ('nouveau', 'reussi', 'apprentissage', 'echec')),
  success_streak integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz
);

-- ========== HISTORIQUE DES RÉPONSES (pour les statistiques) ==========
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result text not null check (result in ('reussi', 'apprentissage', 'echec')),
  answered_at timestamptz not null default now()
);

create index if not exists chapters_subject_id_idx on public.chapters(subject_id);
create index if not exists sheets_chapter_id_idx on public.sheets(chapter_id);
create index if not exists questions_chapter_id_idx on public.questions(chapter_id);
create index if not exists question_reviews_next_review_idx on public.question_reviews(user_id, next_review_at);
create index if not exists quiz_answers_user_date_idx on public.quiz_answers(user_id, answered_at);

-- ========== ROW LEVEL SECURITY ==========
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.sheets enable row level security;
alter table public.questions enable row level security;
alter table public.question_reviews enable row level security;
alter table public.quiz_answers enable row level security;

create policy "subjects_owner" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chapters_owner" on public.chapters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sheets_owner" on public.sheets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "questions_owner" on public.questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "question_reviews_owner" on public.question_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_answers_owner" on public.quiz_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== STOCKAGE (fichiers de fiches importées) ==========
insert into storage.buckets (id, name, public)
values ('sheets', 'sheets', false)
on conflict (id) do nothing;

create policy "sheets_storage_owner_select" on storage.objects
  for select using (bucket_id = 'sheets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "sheets_storage_owner_insert" on storage.objects
  for insert with check (bucket_id = 'sheets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "sheets_storage_owner_update" on storage.objects
  for update using (bucket_id = 'sheets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "sheets_storage_owner_delete" on storage.objects
  for delete using (bucket_id = 'sheets' and auth.uid()::text = (storage.foldername(name))[1]);
