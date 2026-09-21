import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, CheckCircle2, Link2Off, RefreshCw, ShieldCheck, User } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  useGenerateTelegramLinkCode,
  useSetReminderEnabled,
  useTelegramLink,
  useUnlinkTelegram,
} from '../hooks/useTelegramLink'
import { useIsAdmin } from '../hooks/useAdmin'
import { useAdminMode } from '../contexts/AdminModeContext'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

export default function SettingsPage() {
  const navigate = useNavigate()
  const { data: isAdmin } = useIsAdmin()
  const { mode } = useAdminMode()
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const { data: link, isLoading, refetch, isFetching } = useTelegramLink(!!pendingCode)
  const generateCode = useGenerateTelegramLinkCode()
  const setReminderEnabled = useSetReminderEnabled()
  const unlink = useUnlinkTelegram()

  const isLinked = !!link?.chat_id

  // Une fois le compte lié côté serveur, on arrête d'afficher l'écran d'attente.
  useEffect(() => {
    if (isLinked) setPendingCode(null)
  }, [isLinked])

  // Affiche un encart d'aide si la liaison n'est toujours pas confirmée après 30s.
  useEffect(() => {
    if (!pendingCode) {
      setShowHint(false)
      return
    }
    const timer = setTimeout(() => setShowHint(true), 30_000)
    return () => clearTimeout(timer)
  }, [pendingCode])

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
        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1">Mode</p>
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              {mode === 'admin' ? <ShieldCheck size={14} /> : <User size={14} />}
              Vous êtes actuellement en mode {mode === 'admin' ? 'administrateur' : 'utilisateur normal'}.
            </p>
            <button
              onClick={() => navigate('/choix-role')}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Changer de mode
            </button>
          </div>
        )}

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
                Ouvrez Telegram, puis appuyez sur <strong>Envoyer</strong> — le message{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded">/start {pendingCode}</code> est déjà écrit, mais
                Telegram ne l'envoie pas tout seul, il faut valider :
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

              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-slate-200 text-slate-600 text-xs py-2 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Vérification…' : 'Vérifier maintenant'}
              </button>

              <p className="text-xs text-slate-400">
                Cette page se met aussi à jour automatiquement dès que la liaison est confirmée.
              </p>

              {showHint && (
                <div className="text-xs text-warning-700 bg-warning-50 rounded-lg p-2.5 space-y-1">
                  <p className="font-medium">Toujours rien après 30 secondes ?</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>
                      Vérifiez que vous avez bien appuyé sur <strong>Envoyer</strong> dans Telegram (pas seulement
                      ouvert la conversation).
                    </li>
                    <li>
                      Si le problème persiste, il peut s'agir d'un souci de configuration côté serveur — contactez la
                      personne qui gère l'application.
                    </li>
                  </ul>
                </div>
              )}
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
