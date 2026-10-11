-- Approbin - 3e type de question "tableau" + validation des chapitres (Questions)
-- À exécuter dans le SQL Editor, après les migrations précédentes.

alter table public.chapters
  add column if not exists questions_ready boolean not null default false;

alter table public.questions
  add column if not exists table_data jsonb;

alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions
  add constraint questions_question_type_check
  check (question_type in ('text', 'accounting', 'table'));
