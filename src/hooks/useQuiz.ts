import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { computeReviewUpdate } from '../lib/spacedRepetition'
import type { QuizResult } from '../types/database'

export interface DueRow {
  question_id: string
  question: string
  answer: string
  next_review_at: string
  success_streak: number
  chapter_id: string
  chapter_name: string
  subject_id: string
  subject_name: string
}

async function fetchDueRows(userId: string, now: string): Promise<DueRow[]> {
  const { data, error } = await supabase
    .from('question_reviews')
    .select(
      `question_id, next_review_at, success_streak,
       question:questions!inner ( id, question, answer, chapter_id,
         chapter:chapters!inner ( id, name, subject_id,
           subject:subjects!inner ( id, name ) ) )`,
    )
    .eq('user_id', userId)
    .lte('next_review_at', now)

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    question_id: row.question_id,
    question: row.question.question,
    answer: row.question.answer,
    next_review_at: row.next_review_at,
    success_streak: row.success_streak,
    chapter_id: row.question.chapter.id,
    chapter_name: row.question.chapter.name,
    subject_id: row.question.chapter.subject.id,
    subject_name: row.question.chapter.subject.name,
  }))
}

/** Regroupe les questions dues par matière/chapitre, pour l'écran de sélection du quizz. */
export function useDueOverview() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['due-overview', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const rows = await fetchDueRows(user!.id, new Date().toISOString())

      const subjectsMap = new Map<
        string,
        { id: string; name: string; count: number; chapters: Map<string, { id: string; name: string; count: number }> }
      >()

      for (const row of rows) {
        if (!subjectsMap.has(row.subject_id)) {
          subjectsMap.set(row.subject_id, { id: row.subject_id, name: row.subject_name, count: 0, chapters: new Map() })
        }
        const subjectEntry = subjectsMap.get(row.subject_id)!
        subjectEntry.count += 1

        if (!subjectEntry.chapters.has(row.chapter_id)) {
          subjectEntry.chapters.set(row.chapter_id, { id: row.chapter_id, name: row.chapter_name, count: 0 })
        }
        subjectEntry.chapters.get(row.chapter_id)!.count += 1
      }

      return {
        total: rows.length,
        subjects: Array.from(subjectsMap.values()).map((s) => ({ ...s, chapters: Array.from(s.chapters.values()) })),
      }
    },
  })
}

/** Charge la file de questions dues pour une session de quizz (éventuellement filtrée par chapitres). */
export function useQuizQueue(chapterIds: string[] | null, enabled: boolean) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['quiz-queue', user?.id, chapterIds],
    enabled: !!user && enabled,
    queryFn: async () => {
      const rows = await fetchDueRows(user!.id, new Date().toISOString())
      const filtered = chapterIds ? rows.filter((r) => chapterIds.includes(r.chapter_id)) : rows
      // Ordre aléatoire pour varier les sessions de révision.
      return filtered.sort(() => Math.random() - 0.5)
    },
    staleTime: Infinity,
  })
}

export function useSubmitQuizAnswer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      questionId: string
      chapterId: string
      subjectId: string
      currentStreak: number
      result: QuizResult
    }) => {
      if (!user) throw new Error('Non connecté')
      const now = new Date()
      const update = computeReviewUpdate({ result: input.result, currentStreak: input.currentStreak, now })

      const { error: reviewError } = await supabase
        .from('question_reviews')
        .update({
          status: update.status,
          success_streak: update.successStreak,
          next_review_at: update.nextReviewAt.toISOString(),
          last_reviewed_at: now.toISOString(),
        })
        .eq('question_id', input.questionId)
      if (reviewError) throw reviewError

      const { error: answerError } = await supabase.from('quiz_answers').insert({
        question_id: input.questionId,
        chapter_id: input.chapterId,
        subject_id: input.subjectId,
        user_id: user.id,
        result: input.result,
        answered_at: now.toISOString(),
      })
      if (answerError) throw answerError

      return update
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-overview', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar', user?.id] })
    },
  })
}
