-- Approbin - planification du rappel quotidien Telegram
--
-- ⚠️ À adapter avant exécution : remplacez <PROJECT_REF> et <SERVICE_ROLE_KEY>
-- par vos propres valeurs (Project Settings -> API), puis exécutez ce script
-- dans le SQL Editor. Faites-le APRÈS avoir déployé la fonction
-- "send-daily-reminders" (voir README).
--
-- Activez d'abord les extensions pg_cron et pg_net : Dashboard -> Database
-- -> Extensions -> recherchez "pg_cron" et "pg_net", activez les deux.
-- (Vous pouvez aussi le faire ici si les extensions sont déjà visibles :)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime une éventuelle planification précédente du même nom avant de la
-- recréer (utile si vous relancez ce script après un changement d'heure).
select cron.unschedule('send-daily-quiz-reminders')
where exists (select 1 from cron.job where jobname = 'send-daily-quiz-reminders');

-- 16h00 UTC = 18h00 heure de Paris en été (CEST). En hiver (CET), Paris est
-- à UTC+1 : remplacez '0 16 * * *' par '0 17 * * *' fin octobre, et
-- inversement fin mars (relancez simplement ce script avec l'heure à jour).
select cron.schedule(
  'send-daily-quiz-reminders',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
