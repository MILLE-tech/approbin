-- Approbin - questions signalées (point d'exclamation) + 4e type de question "schéma"
-- À exécuter dans le SQL Editor, après les migrations précédentes.

alter table public.questions
  add column if not exists flagged boolean not null default false,
  add column if not exists drawing_data jsonb;

alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions
  add constraint questions_question_type_check
  check (question_type in ('text', 'accounting', 'table', 'drawing'));
