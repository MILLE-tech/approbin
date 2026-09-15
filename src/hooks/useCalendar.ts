import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { ReviewStatus } from '../types/database'

export interface ScheduledQuestion {
  question_id: string
  question: string
  status: ReviewStatus
  next_review_at: string
  chapter_name: string
  subject_name: string
}

export function useCalendarQuestions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['calendar', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ScheduledQuestion[]> => {
      const { data, error } = await supabase
        .from('question_reviews')
        .select(
          `question_id, status, next_review_at,
           question:questions!inner ( question,
             chapter:chapters!inner ( name,
               subject:subjects!inner ( name ) ) )`,
        )
        .eq('user_id', user!.id)
        .order('next_review_at', { ascending: true })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((row) => ({
        question_id: row.question_id,
        question: row.question.question,
        status: row.status as ReviewStatus,
        next_review_at: row.next_review_at,
        chapter_name: row.question.chapter.name,
        subject_name: row.question.chapter.subject.name,
      }))
    },
  })
}
