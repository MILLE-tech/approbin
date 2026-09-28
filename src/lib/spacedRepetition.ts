import type { QuizResult, ReviewStatus } from '../types/database'

/**
 * Paliers (en jours) des réussites successives d'une même question :
 * 1re réussite -> 3j, 2e -> 5j, 3e -> 7j, puis 14, 21, 30, 45j (palier final répété ensuite).
 */
export const SUCCESS_INTERVALS_DAYS = [3, 5, 7, 14, 21, 30, 45]

export interface ReviewUpdateInput {
  result: QuizResult
  currentStreak: number
  now?: Date
}

export interface ReviewUpdateOutput {
  status: ReviewStatus
  successStreak: number
  nextReviewAt: Date
}

function atMidnight(date: Date, daysToAdd = 0): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + daysToAdd)
  next.setHours(0, 0, 0, 0)
  return next
}

export function computeReviewUpdate({ result, currentStreak, now = new Date() }: ReviewUpdateInput): ReviewUpdateOutput {
  if (result === 'echec') {
    // Plus de minuteur : la question redevient disponible dès aujourd'hui
    // (minuit), et revient simplement en fin de file dans la session en cours.
    return {
      status: 'echec',
      successStreak: 0,
      nextReviewAt: atMidnight(now),
    }
  }

  if (result === 'apprentissage') {
    return {
      status: 'apprentissage',
      successStreak: currentStreak,
      nextReviewAt: atMidnight(now, 1),
    }
  }

  // result === 'reussi'
  const newStreak = currentStreak + 1
  const intervalDays = SUCCESS_INTERVALS_DAYS[Math.min(newStreak - 1, SUCCESS_INTERVALS_DAYS.length - 1)]
  return {
    status: 'reussi',
    successStreak: newStreak,
    nextReviewAt: atMidnight(now, intervalDays),
  }
}
