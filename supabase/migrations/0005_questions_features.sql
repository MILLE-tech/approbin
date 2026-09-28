-- Approbin - mode examen, questions inversées, activation, mode comptabilité
-- À exécuter dans le SQL Editor, après les migrations précédentes.

alter table public.questions
  add column if not exists active boolean not null default true,
  add column if not exists can_reverse boolean not null default false,
  add column if not exists question_type text not null default 'text'
    check (question_type in ('text', 'accounting')),
  add column if not exists accounting_data jsonb;

create index if not exists questions_active_idx on public.questions(chapter_id, active);

-- Corrige les échéances déjà planifiées qui portaient l'heure de la réponse
-- (ex: 14h32) au lieu de minuit : elles ne redevenaient "à faire" qu'à cette
-- heure précise les jours suivants. Les nouvelles échéances sont désormais
-- calées à minuit (heure locale) directement par l'application.
update public.question_reviews
set next_review_at = date_trunc('day', next_review_at)
where next_review_at <> date_trunc('day', next_review_at);
