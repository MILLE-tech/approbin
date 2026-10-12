import type { Transition, TargetAndTransition, Variants } from 'motion/react'

interface SimpleVariants {
  initial: TargetAndTransition
  animate: TargetAndTransition
  exit?: TargetAndTransition
}

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

/**
 * Entrée/sortie d'une question à l'autre (quizz/examen) : toujours dans le
 * même sens (on avance), jamais aléatoire, pour rester spatialement
 * cohérent. Simple fondu sous reduced-motion (pas de glissement).
 */
export function questionVariants(reducedMotion: boolean): SimpleVariants {
  if (reducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  }
  return {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  }
}

/** Apparition de la correction / des actions une fois la réponse révélée. */
export function revealVariants(reducedMotion: boolean): SimpleVariants {
  if (reducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  }
}

/** Apparition/disparition d'un élément de liste (carte de dossier, ligne de question). */
export function listItemVariants(reducedMotion: boolean): SimpleVariants {
  if (reducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  }
  return {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  }
}

/**
 * Transition directionnelle (page précédente/suivante, mois précédent/
 * suivant) dont le sens peut changer d'une navigation à l'autre.
 *
 * Utilise des variants-fonctions + le prop `custom` d'AnimatePresence
 * plutôt que des valeurs figées : contrairement aux props d'un enfant
 * "sortant" (gelées au moment où il a été créé), AnimatePresence relit
 * `custom` au moment même où l'élément commence sa sortie. Sans ça, la
 * sortie utilise la direction d'une navigation précédente (figée), et
 * seule l'entrée glisse dans le bon sens — exactement le bug où le
 * changement de mois du calendrier ne semblait pas glisser.
 */
export function directionalVariants(offset: number, reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  }
  return {
    initial: (direction: number) => ({ opacity: 0, x: direction * offset }),
    animate: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: direction * -offset }),
  }
}

/** Écran de fin (session terminée / examen fini) : une seule apparition, satisfaisante. */
export function completionVariants(reducedMotion: boolean): SimpleVariants {
  if (reducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 } }
  }
  return {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
  }
}
