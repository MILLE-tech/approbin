import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { m, AnimatePresence } from 'motion/react'
import { ShieldCheck, User } from 'lucide-react'
import { useIsAdmin } from '../hooks/useAdmin'
import { useAdminMode, type RoleMode } from '../contexts/AdminModeContext'
import { useMotionPreferences } from '../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition, revealVariants, completionVariants } from '../lib/motionTokens'

export default function RoleChoice() {
  const navigate = useNavigate()
  const { data: isAdmin, isLoading } = useIsAdmin()
  const { setMode } = useAdminMode()
  const { reducedMotion } = useMotionPreferences()
  const transition = reducedMotion ? reducedMotionTransition : springs.default
  const rVariants = revealVariants(reducedMotion)
  const cVariants = completionVariants(reducedMotion)

  // Ce compte n'est pas admin : rien à choisir, on continue normalement.
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/fiches', { replace: true })
    }
  }, [isLoading, isAdmin, navigate])

  function choose(next: RoleMode) {
    setMode(next)
    navigate(next === 'admin' ? '/admin' : '/fiches', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <AnimatePresence mode="wait">
        {isLoading || !isAdmin ? (
          <m.p
            key="loading"
            initial={rVariants.initial}
            animate={rVariants.animate}
            exit={rVariants.exit}
            transition={transition}
            className="text-sm text-slate-400"
          >
            Chargement…
          </m.p>
        ) : (
          <m.div
            key="choice"
            initial={cVariants.initial}
            animate={cVariants.animate}
            transition={transition}
            className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center"
          >
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Comment souhaitez-vous continuer ?</h1>
            <p className="text-sm text-slate-500 mb-6">Ce compte a accès au panneau admin.</p>

            <div className="space-y-3">
              <m.button
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => choose('user')}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:shadow-sm transition"
              >
                <User className="text-brand-500 shrink-0" size={22} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">Utilisateur normal</p>
                  <p className="text-xs text-slate-400">Utiliser Approbin comme un compte classique.</p>
                </div>
              </m.button>

              <m.button
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => choose('admin')}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:shadow-sm transition"
              >
                <ShieldCheck className="text-brand-500 shrink-0" size={22} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">Administrateur</p>
                  <p className="text-xs text-slate-400">Accéder directement au panneau admin.</p>
                </div>
              </m.button>
            </div>

            <p className="text-xs text-slate-400 mt-5">Vous pourrez changer de mode à tout moment depuis Paramètres.</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
