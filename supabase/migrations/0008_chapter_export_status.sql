-- Approbin - statut d'export des chapitres (exporté / à réexporter)
-- À exécuter dans le SQL Editor, après les migrations précédentes.

alter table public.chapters
  add column if not exists exported_at timestamptz,
  add column if not exists content_changed_at timestamptz;

-- Date de dernière modification du contenu exportable d'un chapitre.
create or replace function public.touch_chapter_content() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.chapters set content_changed_at = now() where id = old.chapter_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.chapters set content_changed_at = now() where id = new.chapter_id;
  end if;
  return null;
end;
$$;

drop trigger if exists questions_touch_chapter_ins_del on public.questions;
create trigger questions_touch_chapter_ins_del
  after insert or delete on public.questions
  for each row execute function public.touch_chapter_content();

-- Seules les colonnes visibles dans l'export comptent (pas l'activation, l'inversion, etc.).
drop trigger if exists questions_touch_chapter_upd on public.questions;
create trigger questions_touch_chapter_upd
  after update of question, answer, question_type, accounting_data, table_data, drawing_data, flagged, chapter_id
  on public.questions
  for each row execute function public.touch_chapter_content();

drop trigger if exists sheets_touch_chapter_ins_del on public.sheets;
create trigger sheets_touch_chapter_ins_del
  after insert or delete on public.sheets
  for each row execute function public.touch_chapter_content();

drop trigger if exists sheets_touch_chapter_upd on public.sheets;
create trigger sheets_touch_chapter_upd
  after update of title, content, file_name, chapter_id
  on public.sheets
  for each row execute function public.touch_chapter_content();

-- Horodatage côté serveur pour rester comparable à content_changed_at (pas d'écart d'horloge).
create or replace function public.mark_chapters_exported(chapter_ids uuid[])
returns void
language sql set search_path = public as $$
  update public.chapters set exported_at = now()
  where id = any(chapter_ids) and user_id = auth.uid();
$$;

grant execute on function public.mark_chapters_exported(uuid[]) to authenticated;
