-- Approbin - panneau admin en lecture seule (support utilisateur)
--
-- Donne à un ou plusieurs comptes existants (choisis par vous) un accès en
-- LECTURE SEULE aux données de tous les utilisateurs, pour pouvoir diagnostiquer
-- un problème signalé par un ami/utilisateur. Aucun compte séparé n'est créé :
-- vous transformez votre compte Approbin existant en compte admin (voir
-- l'étape finale de ce fichier).

-- ========== LISTE DES ADMINS ==========
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Un utilisateur peut seulement vérifier s'il est lui-même admin.
-- L'ajout d'un admin se fait manuellement (par vous, via le SQL Editor,
-- qui contourne RLS) : aucune policy d'insertion n'est créée ici,
-- volontairement, pour qu'un utilisateur ne puisse jamais se nommer admin.
create policy "admin_users_self_select" on public.admin_users
  for select using (auth.uid() = user_id);

-- ========== PROFILS (email par utilisateur, pour la recherche admin) ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- Remplit automatiquement un profil à chaque inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rattrape les comptes déjà créés avant l'ajout de cette table.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

alter table public.profiles enable row level security;

create policy "profiles_self_or_admin_select" on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.admin_users a where a.user_id = auth.uid())
  );

-- ========== ACCÈS EN LECTURE ÉTENDU AUX ADMINS ==========
-- Ajoute, en plus des policies existantes (propriétaire uniquement), un accès
-- SELECT pour les admins sur toutes les données utilisateur. Aucun droit
-- d'écriture (insert/update/delete) n'est donné : l'accès admin est
-- strictement en lecture seule.

create policy "subjects_admin_select" on public.subjects
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "chapters_admin_select" on public.chapters
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "sheets_admin_select" on public.sheets
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "questions_admin_select" on public.questions
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "question_reviews_admin_select" on public.question_reviews
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "quiz_answers_admin_select" on public.quiz_answers
  for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Permet aussi aux admins de consulter les fichiers de fiches importées.
create policy "sheets_storage_admin_select" on storage.objects
  for select using (
    bucket_id = 'sheets'
    and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
  );

-- ========== DERNIÈRE ÉTAPE : VOUS RENDRE ADMIN ==========
-- Remplacez 'votre-email@exemple.com' par l'email de VOTRE compte Approbin
-- existant (celui avec lequel vous vous connectez déjà), puis exécutez
-- cette ligne séparément si elle n'a pas encore été lancée :
--
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'votre-email@exemple.com';
