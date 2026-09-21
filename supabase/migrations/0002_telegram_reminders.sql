-- Approbin - rappel quotidien via Telegram
-- À exécuter dans le SQL Editor de votre projet Supabase, après 0001_init.sql.

create table if not exists public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id bigint,
  link_code text unique,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists telegram_links_link_code_idx on public.telegram_links(link_code);
create index if not exists telegram_links_chat_id_idx on public.telegram_links(chat_id);

alter table public.telegram_links enable row level security;

-- L'utilisateur ne peut lire/modifier que sa propre ligne de liaison.
create policy "telegram_links_owner_select" on public.telegram_links
  for select using (auth.uid() = user_id);

create policy "telegram_links_owner_insert" on public.telegram_links
  for insert with check (auth.uid() = user_id);

create policy "telegram_links_owner_update" on public.telegram_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Les Edge Functions (webhook Telegram, envoi des rappels) utilisent la clé
-- service_role, qui contourne RLS : aucune policy supplémentaire n'est nécessaire
-- pour elles.
