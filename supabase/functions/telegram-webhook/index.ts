// Reçoit les mises à jour du bot Telegram (webhook), et lie le compte
// Approbin de l'utilisateur à son chat_id Telegram via un code temporaire
// généré depuis la page Paramètres de l'application.
//
// À déployer sur Supabase (Dashboard -> Edge Functions -> New function,
// nom "telegram-webhook", coller ce code), puis appeler une fois :
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL de cette fonction>&secret_token=<TELEGRAM_WEBHOOK_SECRET>
//
// Secrets requis (Dashboard -> Edge Functions -> Secrets) :
//   TELEGRAM_BOT_TOKEN        : jeton du bot obtenu via @BotFather
//   TELEGRAM_WEBHOOK_SECRET   : chaîne aléatoire de votre choix (vérifie que
//                               la requête vient bien de Telegram)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (TELEGRAM_WEBHOOK_SECRET) {
    const received = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (received !== TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const update = await req.json().catch(() => null)
  const message = update?.message
  const chatId: number | undefined = message?.chat?.id
  const text: string | undefined = message?.text

  if (!chatId || !text) {
    return new Response('ok')
  }

  if (text.startsWith('/start')) {
    const code = text.replace('/start', '').trim()

    if (!code) {
      await sendTelegramMessage(
        chatId,
        "👋 Ouvrez l'application Approbin, allez dans Paramètres, puis cliquez sur « Lier Telegram » pour activer vos rappels quotidiens.",
      )
      return new Response('ok')
    }

    const { data: link, error } = await supabase
      .from('telegram_links')
      .select('user_id')
      .eq('link_code', code)
      .maybeSingle()

    if (error || !link) {
      await sendTelegramMessage(
        chatId,
        "❌ Ce lien n'est plus valide. Retournez dans Approbin (Paramètres) pour en générer un nouveau.",
      )
      return new Response('ok')
    }

    await supabase
      .from('telegram_links')
      .update({ chat_id: chatId, link_code: null, reminder_enabled: true })
      .eq('user_id', link.user_id)

    await sendTelegramMessage(
      chatId,
      '✅ Compte Approbin lié ! Vous recevrez un rappel ici chaque jour si des questions sont à réviser. Envoyez /stop pour désactiver ce rappel à tout moment.',
    )
    return new Response('ok')
  }

  if (text.startsWith('/stop')) {
    await supabase.from('telegram_links').update({ reminder_enabled: false }).eq('chat_id', chatId)
    await sendTelegramMessage(chatId, '🔕 Rappels désactivés. Envoyez /start depuis Approbin pour les réactiver.')
    return new Response('ok')
  }

  return new Response('ok')
})
