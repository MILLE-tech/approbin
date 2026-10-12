import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { m, AnimatePresence } from 'motion/react'
import { BookOpen, HelpCircle, BarChart3, CalendarDays, Download, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAdminMode } from '../contexts/AdminModeContext'
import { useIsAdmin } from '../hooks/useAdmin'
import { useMotionPreferences } from '../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition } from '../lib/motionTokens'

const NAV_ITEMS = [
  { to: '/fiches', label: 'Fiches', icon: BookOpen },
  { to: '/questions', label: 'Questions', icon: HelpCircle },
  { to: '/statistiques', label: 'Statistiques', icon: BarChart3 },
  { to: '/calendrier', label: 'Calendrier', icon: CalendarDays },
  { to: '/export', label: 'Export', icon: Download },
]

function pathDepth(pathname: string) {
  return pathname.split('/').filter(Boolean).length
}

export default function AppLayout() {
  const { signOut, user } = useAuth()
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin()
  const { mode } = useAdminMode()
  const { reducedMotion, reducedTransparency } = useMotionPreferences()
  const navigate = useNavigate()
  const location = useLocation()

  const mainRef = useRef<HTMLElement>(null)
  const prevDepthRef = useRef(pathDepth(location.pathname))
  // -1 = on recule (chemin plus court), 1 = on avance (plus profond), 0 = même profondeur (onglets voisins).
  const [direction, setDirection] = useState(0)

  // Un compte admin qui n'a pas encore choisi son mode pour cette session
  // (connexion récente, ou session restaurée après réouverture du navigateur)
  // est renvoyé vers l'écran de choix avant d'accéder au reste de l'app.
  useEffect(() => {
    if (!checkingAdmin && isAdmin && mode === null) {
      navigate('/choix-role', { replace: true })
    }
  }, [checkingAdmin, isAdmin, mode, navigate])

  // Direction déduite de la profondeur du chemin : fonctionne aussi bien
  // pour le bouton retour de l'app que pour celui du navigateur, puisqu'on
  // compare le résultat (l'URL), pas la façon dont on y est arrivé.
  useEffect(() => {
    const depth = pathDepth(location.pathname)
    const prevDepth = prevDepthRef.current
    setDirection(depth > prevDepth ? 1 : depth < prevDepth ? -1 : 0)
    prevDepthRef.current = depth
    // Nouvel écran = on repart du haut (comme un push natif), indépendant de l'anim.
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  const showAdminLink = isAdmin && mode === 'admin'
  const transition = reducedMotion ? reducedMotionTransition : springs.default
  const offset = reducedMotion ? 0 : 20

  const pageVariants = {
    initial: { opacity: 0, x: direction === 0 ? 0 : direction * offset },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === 0 ? 0 : direction * -offset },
  }

  const barSurface = reducedTransparency
    ? 'bg-white'
    : 'bg-white/75 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60'

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-slate-900">Approbin</h1>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 space-y-1">
          {showAdminLink && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg ${
                  isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin
            </NavLink>
          )}
          <NavLink
            to="/parametres"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg ${
                isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
              }`
            }
          >
            <Settings size={18} />
            Paramètres
          </NavLink>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <header className={`md:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200/70 ${barSurface}`}>
        <h1 className="text-base font-semibold text-slate-900">Approbin</h1>
        <div className="flex items-center gap-3">
          {showAdminLink && (
            <NavLink to="/admin" className="text-slate-400" aria-label="Admin">
              <ShieldCheck size={20} />
            </NavLink>
          )}
          <NavLink to="/parametres" className="text-slate-400" aria-label="Paramètres">
            <Settings size={20} />
          </NavLink>
          <button onClick={() => signOut()} className="text-slate-400" aria-label="Déconnexion">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 pb-16 md:pb-0 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            initial={pageVariants.initial}
            animate={pageVariants.animate}
            exit={pageVariants.exit}
            transition={transition}
          >
            <Outlet />
          </m.div>
        </AnimatePresence>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200/70 flex justify-around py-1.5 ${barSurface}`}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
