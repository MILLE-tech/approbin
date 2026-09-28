import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { AccountingData, QuestionType } from '../types/database'

export interface ExamQuestion {
  question_id: string
  question: string
  answer: string
  question_type: QuestionType
  accounting_data: AccountingData | null
  can_reverse: boolean
  chapter_id: string
  chapter_name: string
  subject_id: string
  subject_name: string
}

interface ChapterOverview {
  id: string
  name: string
  count: number
}

interface SubjectOverview {
  id: string
  name: string
  count: number
  chapters: ChapterOverview[]
}

/** Matières/chapitres avec le nombre de questions actives disponibles pour un examen. */
export function useExamOverview() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['exam-overview', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ total: number; subjects: SubjectOverview[] }> => {
      const { data, error } = await supabase
        .from('questions')
        .select(
          `id, chapter_id, active,
           chapter:chapters!inner ( id, name, subject_id,
             subject:subjects!inner ( id, name ) )`,
        )
        .eq('user_id', user!.id)
        .eq('active', true)

      if (error) throw error

      const subjectsMap = new Map<string, SubjectOverview>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of data as any[]) {
        const subjectId = row.chapter.subject.id
        const subjectName = row.chapter.subject.name
        const chapterId = row.chapter.id
        const chapterName = row.chapter.name

        if (!subjectsMap.has(subjectId)) {
          subjectsMap.set(subjectId, { id: subjectId, name: subjectName, count: 0, chapters: [] })
        }
        const subjectEntry = subjectsMap.get(subjectId)!
        subjectEntry.count += 1

        let chapterEntry = subjectEntry.chapters.find((c) => c.id === chapterId)
        if (!chapterEntry) {
          chapterEntry = { id: chapterId, name: chapterName, count: 0 }
          subjectEntry.chapters.push(chapterEntry)
        }
        chapterEntry.count += 1
      }

      return { total: (data ?? []).length, subjects: Array.from(subjectsMap.values()) }
    },
  })
}

/** Charge toutes les questions actives disponibles pour un examen (sans notion d'échéance). */
export function useExamQuestionPool(chapterIds: string[] | null, enabled: boolean) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['exam-pool', user?.id, chapterIds],
    enabled: !!user && enabled,
    queryFn: async (): Promise<ExamQuestion[]> => {
      let query = supabase
        .from('questions')
        .select(
          `id, question, answer, question_type, accounting_data, can_reverse, chapter_id,
           chapter:chapters!inner ( id, name, subject_id,
             subject:subjects!inner ( id, name ) )`,
        )
        .eq('user_id', user!.id)
        .eq('active', true)

      if (chapterIds && chapterIds.length > 0) {
        query = query.in('chapter_id', chapterIds)
      }

      const { data, error } = await query
      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((row) => ({
        question_id: row.id,
        question: row.question,
        answer: row.answer,
        question_type: row.question_type,
        accounting_data: row.accounting_data,
        can_reverse: row.can_reverse,
        chapter_id: row.chapter.id,
        chapter_name: row.chapter.name,
        subject_id: row.chapter.subject.id,
        subject_name: row.chapter.subject.name,
      }))
    },
    staleTime: Infinity,
  })
}
