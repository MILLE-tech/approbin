import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'signin' | 'signup' | 'reset'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    if (mode === 'reset') {
      const { error } = await resetPassword(email)
      setSubmitting(false)
      if (error) {
        setError(error)
        return
      }
      setInfo('Si un compte existe avec cet email, un lien de réinitialisation vient de vous être envoyé.')
      return
    }

    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    setSubmitting(false)

    if (error) {
      setError(error)
      return
    }

    if (mode === 'signup') {
      setInfo('Compte créé ! Vérifiez vos emails si une confirmation est requise, puis connectez-vous.')
      switchMode('signin')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Approbin</h1>
        <p className="text-slate-500 text-sm mb-6">
          {mode === 'reset' ? 'Réinitialiser votre mot de passe' : 'Vos fiches et quiz de révision.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-xs text-brand-600 hover:text-brand-700 -mt-2"
            >
              Mot de passe oublié ?
            </button>
          )}

          {error && <p className="text-sm text-danger-600">{error}</p>}
          {info && <p className="text-sm text-success-600">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 text-white font-medium py-2 text-sm hover:bg-brand-700 disabled:opacity-60 transition"
          >
            {submitting
              ? 'Patientez…'
              : mode === 'signin'
                ? 'Se connecter'
                : mode === 'signup'
                  ? 'Créer mon compte'
                  : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>

        <button
          onClick={() => switchMode(mode === 'signup' ? 'signin' : mode === 'reset' ? 'signin' : 'signup')}
          className="w-full text-center text-sm text-brand-600 hover:text-brand-700 mt-4"
        >
          {mode === 'signin' && "Pas encore de compte ? S'inscrire"}
          {mode === 'signup' && 'Déjà un compte ? Se connecter'}
          {mode === 'reset' && 'Retour à la connexion'}
        </button>
      </div>
    </div>
  )
}
