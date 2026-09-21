// Envoie un message Telegram à chaque utilisateur ayant lié son compte et
// ayant au moins une question à réviser aujourd'hui (ou en retard).
// Appelée chaque jour par un job pg_cron (voir README) -> ne fait rien si
// invoquée "à la main" hors de l'heure prévue, elle est idempotente : elle
// renvoie simplement le même rappel si on la rappelle plusieurs fois.
//
// À déployer sur Supabase (Dashboard -> Edge Functions -> New function,
// nom "send-daily-reminders", coller ce code).
//
// Secrets requis (Dashboard -> Edge Functions -> Secrets) :
//   TELEGRAM_BOT_TOKEN : jeton du bot obtenu via @BotFather
//   APP_URL            : (optionnel) URL de l'app, ex: https://approbin.vercel.app

import { createClient } from 'jsr:@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const APP_URL = Deno.env.get('APP_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function sendTelegramMessage(chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  return res.ok
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { data: links, error: linksError } = await supabase
    .from('telegram_links')
    .select('user_id, chat_id')
    .eq('reminder_enabled', true)
    .not('chat_id', 'is', null)

  if (linksError) {
    return new Response(JSON.stringify({ error: linksError.message }), { status: 500 })
  }
  if (!links || links.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no linked users' }))
  }

  const userIds = links.map((l) => l.user_id)

  const { data: dueReviews, error: reviewsError } = await supabase
    .from('question_reviews')
    .select('user_id')
    .in('user_id', userIds)
    .lte('next_review_at', new Date().toISOString())

  if (reviewsError) {
    return new Response(JSON.stringify({ error: reviewsError.message }), { status: 500 })
  }

  const counts = new Map<string, number>()
  for (const row of dueReviews ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
  }

  let sent = 0
  for (const link of links) {
    const count = counts.get(link.user_id) ?? 0
    if (count === 0) continue

    const plural = count > 1 ? 's' : ''
    const lines = [
      `📚 Vous avez ${count} question${plural} à réviser aujourd'hui sur Approbin !`,
    ]
    if (APP_URL) lines.push(APP_URL)

    const ok = await sendTelegramMessage(link.chat_id as number, lines.join('\n'))
    if (ok) sent += 1
  }

  return new Response(JSON.stringify({ sent, eligible: links.length }))
})
