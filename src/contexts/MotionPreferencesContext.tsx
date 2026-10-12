import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface MotionPreferences {
  reducedMotion: boolean
  reducedTransparency: boolean
  moreContrast: boolean
}

const MotionPreferencesContext = createContext<MotionPreferences | undefined>(undefined)

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    let mql: MediaQueryList
    try {
      mql = window.matchMedia(query)
    } catch {
      return
    }
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const reducedTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)')
  const moreContrast = useMediaQuery('(prefers-contrast: more)')

  return (
    <MotionPreferencesContext.Provider value={{ reducedMotion, reducedTransparency, moreContrast }}>
      {children}
    </MotionPreferencesContext.Provider>
  )
}

export function useMotionPreferences() {
  const ctx = useContext(MotionPreferencesContext)
  if (!ctx) throw new Error('useMotionPreferences doit être utilisé dans un MotionPreferencesProvider')
  return ctx
}
