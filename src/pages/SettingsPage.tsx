import { useEffect, useState } from 'react'
import { Send, CheckCircle2, Link2Off } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  useGenerateTelegramLinkCode,
  useSetReminderEnabled,
  useTelegramLink,
  useUnlinkTelegram,
} from '../hooks/useTelegramLink'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

export default function SettingsPage() {
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const { data: link, isLoading } = useTelegramLink(!!pendingCode)
  const generateCode = useGenerateTelegramLinkCode()
  const setReminderEnabled = useSetReminderEnabled()
  const unlink = useUnlinkTelegram()

  const isLinked = !!link?.chat_id

  // Une fois le compte lié côté serveur, on arrête d'afficher l'écran d'attente.
  useEffect(() => {
    if (isLinked) setPendingCode(null)
  }, [isLinked])

  async function handleGenerate() {
    setGenerateError(null)
    try {
      const code = await generateCode.mutateAsync()
      setPendingCode(code)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const deepLink = pendingCode && BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=${pendingCode}` : null

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Rappel quotidien de révision" />
      <div className="p-5 max-w-md space-y-4">
        {!BOT_USERNAME && (
          <p className="text-sm text-warning-600 bg-warning-50 rounded-lg p-3">
            Le rappel Telegram n'est pas encore configuré pour cette application (variable
            VITE_TELEGRAM_BOT_USERNAME manquante).
          </p>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Send size={18} className="text-brand-500" />
            <p className="text-sm font-semibold text-slate-800">Rappel Telegram</p>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Recevez un message chaque jour si des questions sont à réviser.
          </p>

          {isLoading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : isLinked ? (
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-sm text-success-600">
                <CheckCircle2 size={16} /> Compte Telegram lié
              </p>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={link?.reminder_enabled ?? false}
                  onChange={(e) => setReminderEnabled.mutate(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Recevoir le rappel quotidien
              </label>

              <button
                onClick={() => unlink.mutate()}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-danger-600"
              >
                <Link2Off size={14} />
                Délier ce compte Telegram
              </button>
            </div>
          ) : pendingCode ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Ouvrez Telegram et démarrez une conversation avec le bot pour finaliser la liaison :
              </p>
              {deepLink ? (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-medium py-2.5 text-sm hover:bg-brand-700"
                >
                  <Send size={16} />
                  Ouvrir Telegram
                </a>
              ) : (
                <p className="text-xs text-warning-600 bg-warning-50 rounded-lg p-2.5">
                  Le bouton "Ouvrir Telegram" n'est pas disponible (VITE_TELEGRAM_BOT_USERNAME non configuré). Envoyez
                  manuellement le code ci-dessous au bot.
                </p>
              )}
              <p className="text-sm text-slate-600">
                Code à envoyer au bot :{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">/start {pendingCode}</code>
              </p>
              <p className="text-xs text-slate-400">
                Une fois le message envoyé, revenez sur cette page (ou actualisez-la) pour voir la confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleGenerate}
                disabled={generateCode.isPending}
                className="rounded-lg bg-brand-600 text-white font-medium px-4 py-2 text-sm hover:bg-brand-700 disabled:opacity-60"
              >
                {generateCode.isPending ? 'Patientez…' : 'Lier Telegram'}
              </button>
              {generateError && (
                <p className="text-xs text-danger-600 bg-danger-50 rounded-lg p-2.5">
                  Échec : {generateError}
                  <br />
                  Vérifiez que la migration <code className="bg-white px-1 rounded">0002_telegram_reminders.sql</code>{' '}
                  a bien été exécutée dans Supabase.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
