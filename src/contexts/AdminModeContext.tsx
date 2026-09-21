import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

export type RoleMode = 'admin' | 'user' | null

const STORAGE_KEY = 'approbin_role_mode'

interface AdminModeContextValue {
  mode: RoleMode
  setMode: (mode: RoleMode) => void
}

const AdminModeContext = createContext<AdminModeContextValue | undefined>(undefined)

function readStoredMode(): RoleMode {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    return value === 'admin' || value === 'user' ? value : null
  } catch {
    return null
  }
}

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [mode, setModeState] = useState<RoleMode>(readStoredMode)

  // Un choix de mode ne doit pas survivre à une déconnexion : le prochain
  // compte connecté (admin ou non) doit repartir sans mode présélectionné.
  useEffect(() => {
    if (!user) {
      setModeState(null)
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [user])

  function setMode(next: RoleMode) {
    setModeState(next)
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore (stockage indisponible, ex: navigation privée)
    }
  }

  return <AdminModeContext.Provider value={{ mode, setMode }}>{children}</AdminModeContext.Provider>
}

export function useAdminMode() {
  const ctx = useContext(AdminModeContext)
  if (!ctx) throw new Error('useAdminMode doit être utilisé dans un AdminModeProvider')
  return ctx
}
