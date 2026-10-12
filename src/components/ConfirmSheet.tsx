import { useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { useMotionPreferences } from '../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition } from '../lib/motionTokens'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmSheetProps {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmSheet({ options, onConfirm, onCancel }: ConfirmSheetProps) {
  const { reducedMotion, reducedTransparency } = useMotionPreferences()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Focus initial sur "Annuler" (option non destructive par défaut),
  // comme pour les alertes natives.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
      return
    }
    // Piège le focus entre les deux boutons de la sheet.
    if (e.key === 'Tab') {
      const focusables = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[]
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const scrimTransition = reducedMotion ? reducedMotionTransition : springs.default
  const sheetTransition = reducedMotion ? reducedMotionTransition : springs.sheet

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <m.div
        className="absolute inset-0 bg-slate-900/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={scrimTransition}
        onClick={onCancel}
        aria-hidden
      />
      <m.div
        ref={sheetRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        aria-describedby="confirm-sheet-message"
        className={`relative w-full max-w-sm rounded-2xl p-5 shadow-xl border ${
          reducedTransparency
            ? 'bg-white border-slate-200'
            : 'bg-white/90 backdrop-blur-xl backdrop-saturate-150 border-white/60'
        }`}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
        transition={sheetTransition}
      >
        <div className="flex items-start gap-3">
          {options.destructive !== false && (
            <div className="shrink-0 w-9 h-9 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          )}
          <div className="min-w-0">
            {options.title && (
              <h2 id="confirm-sheet-title" className="text-sm font-semibold text-slate-900 mb-1">
                {options.title}
              </h2>
            )}
            <p id="confirm-sheet-message" className="text-sm text-slate-600">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <m.button
            ref={cancelRef}
            onClick={onCancel}
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50"
          >
            {options.cancelLabel ?? 'Annuler'}
          </m.button>
          <m.button
            ref={confirmRef}
            onClick={onConfirm}
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            className={`rounded-lg text-white text-sm font-medium px-4 py-2 ${
              options.destructive !== false ? 'bg-danger-600 hover:bg-danger-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {options.confirmLabel ?? 'Supprimer'}
          </m.button>
        </div>
      </m.div>
    </div>
  )
}

export function ConfirmSheetRoot({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmOptions | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      {state && <ConfirmSheet options={state} onConfirm={onConfirm} onCancel={onCancel} />}
    </AnimatePresence>
  )
}
