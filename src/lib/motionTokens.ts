import type { Transition } from 'motion/react'

/**
 * Springs, pas de durées fixes. L'API bounce + duration de Motion est le
 * mapping web le plus proche des paramètres damping/response d'Apple :
 * bounce 0 = damping 1.0 (critically damped), bounce > 0 = sous-amorti.
 *
 * Règle : amortissement 1.0 (bounce 0) par défaut partout ; le rebond
 * (momentum) est réservé aux interactions qui suivent un geste avec de
 * l'élan (drag/swipe relâché), jamais à une simple apparition/disparition.
 */
export const springs = {
  /** Repositionnement, apparitions/disparitions standard. */
  default: { type: 'spring', duration: 0.4, bounce: 0 } satisfies Transition,
  /** Petits éléments interactifs (boutons, cartes) : un peu plus vif. */
  snappy: { type: 'spring', duration: 0.3, bounce: 0 } satisfies Transition,
  /** Sheets / tiroirs / modales. */
  sheet: { type: 'spring', duration: 0.3, bounce: 0.2 } satisfies Transition,
  /** Uniquement après un geste qui a transmis de la vitesse (flick/drag). */
  momentum: { type: 'spring', duration: 0.4, bounce: 0.2 } satisfies Transition,
} as const

/** Fondu simple, utilisé quand prefers-reduced-motion est actif. */
export const reducedMotionTransition: Transition = { duration: 0.15, ease: 'linear' }

/** Feedback au press : scale sur whileTap, jamais sur release. */
export const pressScale = { scale: 0.96 }
export const pressScaleSubtle = { scale: 0.98 }
