import type { QuizResult, ReviewStatus } from '../types/database'

/**
 * Paliers (en jours) des réussites successives d'une même question :
 * 1re réussite -> 3j, 2e -> 5j, 3e -> 7j, puis 14, 21, 30, 45j (palier final répété ensuite).
 */
export const SUCCESS_INTERVALS_DAYS = [3, 5, 7, 14, 21, 30, 45]

export const FAILURE_DELAY_MS = 5 * 60 * 1000

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

export function computeReviewUpdate({ result, currentStreak, now = new Date() }: ReviewUpdateInput): ReviewUpdateOutput {
  if (result === 'echec') {
    return {
      status: 'echec',
      successStreak: 0,
      nextReviewAt: new Date(now.getTime() + FAILURE_DELAY_MS),
    }
  }

  if (result === 'apprentissage') {
    const next = new Date(now)
    next.setDate(next.getDate() + 1)
    return {
      status: 'apprentissage',
      successStreak: currentStreak,
      nextReviewAt: next,
    }
  }

  // result === 'reussi'
  const newStreak = currentStreak + 1
  const intervalDays = SUCCESS_INTERVALS_DAYS[Math.min(newStreak - 1, SUCCESS_INTERVALS_DAYS.length - 1)]
  const next = new Date(now)
  next.setDate(next.getDate() + intervalDays)
  return {
    status: 'reussi',
    successStreak: newStreak,
    nextReviewAt: next,
  }
}
