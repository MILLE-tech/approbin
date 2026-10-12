import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { m, AnimatePresence } from 'motion/react'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput from '../components/PasswordInput'
import { useMotionPreferences } from '../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition, revealVariants } from '../lib/motionTokens'

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { reducedMotion } = useMotionPreferences()
  const transition = reducedMotion ? reducedMotionTransition : springs.default
  const rVariants = revealVariants(reducedMotion)

  // Le lien reçu par email contient un jeton qui crée une session temporaire ;
  // sans cette session, il n'y a rien à réinitialiser.
  const hasRecoverySession = !loading && !!session

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => navigate('/', { replace: true }), 1500)
      return () => clearTimeout(timeout)
    }
  }, [success, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)

    if (error) {
      setError(error)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Nouveau mot de passe</h1>

        <AnimatePresence mode="wait">
          {loading ? (
            <m.p
              key="loading"
              initial={rVariants.initial}
              animate={rVariants.animate}
              exit={rVariants.exit}
              transition={transition}
              className="text-sm text-slate-400 mt-4"
            >
              Chargement…
            </m.p>
          ) : !hasRecoverySession ? (
            <m.div
              key="invalid"
              initial={rVariants.initial}
              animate={rVariants.animate}
              exit={rVariants.exit}
              transition={transition}
              className="mt-4 space-y-3"
            >
              <p className="text-sm text-slate-500">
                Ce lien n'est plus valide ou a déjà été utilisé. Redemandez un lien de réinitialisation depuis l'écran
                de connexion.
              </p>
              <m.button
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="w-full rounded-lg bg-brand-600 text-white font-medium py-2 text-sm hover:bg-brand-700"
              >
                Retour à la connexion
              </m.button>
            </m.div>
          ) : success ? (
            <m.p
              key="success"
              initial={rVariants.initial}
              animate={rVariants.animate}
              exit={rVariants.exit}
              transition={transition}
              className="text-sm text-success-600 mt-4"
            >
              Mot de passe mis à jour ! Redirection…
            </m.p>
          ) : (
            <m.form
              key="form"
              initial={rVariants.initial}
              animate={rVariants.animate}
              exit={rVariants.exit}
              transition={transition}
              onSubmit={handleSubmit}
              className="space-y-4 mt-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                  Nouveau mot de passe
                </label>
                <PasswordInput
                  id="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="confirm">
                  Confirmer le mot de passe
                </label>
                <PasswordInput
                  id="confirm"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {error && <p className="text-sm text-danger-600">{error}</p>}

              <m.button
                whileTap={reducedMotion || submitting ? undefined : { scale: 0.97 }}
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand-600 text-white font-medium py-2 text-sm hover:bg-brand-700 disabled:opacity-60 transition"
              >
                {submitting ? 'Patientez…' : 'Enregistrer'}
              </m.button>
            </m.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
