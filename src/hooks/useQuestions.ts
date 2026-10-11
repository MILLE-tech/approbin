import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { AccountingData, Chapter, Question, QuestionType, TableData } from '../types/database'

export interface ChapterWithQuestionCount extends Chapter {
  questionCount: number
}

/** Chapitres d'une matière avec le nombre de questions créées, pour l'écran de validation. */
export function useChaptersWithQuestionCounts(subjectId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chapters-question-counts', subjectId],
    enabled: !!user && !!subjectId,
    queryFn: async (): Promise<ChapterWithQuestionCount[]> => {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', subjectId as string)
        .eq('user_id', user!.id)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error

      const chapterIds = (chapters ?? []).map((c) => c.id)
      const { data: questions, error: qError } = chapterIds.length
        ? await supabase.from('questions').select('chapter_id').in('chapter_id', chapterIds)
        : { data: [], error: null }
      if (qError) throw qError

      const counts = new Map<string, number>()
      for (const q of questions ?? []) counts.set(q.chapter_id, (counts.get(q.chapter_id) ?? 0) + 1)

      return (chapters ?? []).map((c) => ({ ...c, questionCount: counts.get(c.id) ?? 0 }) as ChapterWithQuestionCount)
    },
  })
}

export function useToggleChapterReady(subjectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ready }: { id: string; ready: boolean }) => {
      const { error } = await supabase.from('chapters').update({ questions_ready: ready }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters-question-counts', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] })
    },
  })
}

export interface SearchedQuestion extends Question {
  chapter_name: string
  subject_name: string
}

/** Recherche des questions par mot-clé (question ou réponse), tous chapitres confondus. */
export function useQuestionSearch(query: string) {
  const { user } = useAuth()
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['questions-search', user?.id, trimmed],
    enabled: !!user && trimmed.length >= 2,
    queryFn: async (): Promise<SearchedQuestion[]> => {
      // `,` et `()` ont un sens particulier dans la syntaxe de filtre PostgREST
      // (séparateur / groupement) : on les retire du terme recherché.
      const safeTerm = trimmed.replace(/[,()]/g, '')
      const { data, error } = await supabase
        .from('questions')
        .select(
          `*, chapter:chapters!inner ( name, subject:subjects!inner ( name ) )`,
        )
        .eq('user_id', user!.id)
        .or(`question.ilike.%${safeTerm}%,answer.ilike.%${safeTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((row) => ({
        ...row,
        chapter_name: row.chapter.name,
        subject_name: row.chapter.subject.name,
      }))
    },
  })
}

export function useQuestions(chapterId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['questions', chapterId],
    enabled: !!user && !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('chapter_id', chapterId as string)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Question[]
    },
  })
}

interface QuestionInput {
  question: string
  answer: string
  questionType: QuestionType
  accountingData: AccountingData | null
  tableData: TableData | null
  canReverse: boolean
}

// Les mutations ci-dessous sont utilisées à la fois depuis une page de
// chapitre (invalidation ciblée) et depuis la recherche globale (qui doit
// être rafraîchie quel que soit le chapitre modifié) : on invalide donc
// systématiquement les deux familles de clés.
function invalidateQuestionCaches(queryClient: ReturnType<typeof useQueryClient>, chapterId?: string) {
  if (chapterId) queryClient.invalidateQueries({ queryKey: ['questions', chapterId] })
  queryClient.invalidateQueries({ queryKey: ['questions'] })
  queryClient.invalidateQueries({ queryKey: ['questions-search'] })
}

export function useCreateQuestion(chapterId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ question, answer, questionType, accountingData, tableData, canReverse }: QuestionInput) => {
      if (!user || !chapterId) throw new Error('Contexte invalide')
      const { data, error } = await supabase
        .from('questions')
        .insert({
          question,
          answer,
          chapter_id: chapterId,
          user_id: user.id,
          question_type: questionType,
          accounting_data: accountingData,
          table_data: tableData,
          can_reverse: canReverse,
          active: true,
        })
        .select()
        .single()
      if (error) throw error

      // Initialise l'état de répétition espacée : disponible dès maintenant.
      const { error: reviewError } = await supabase.from('question_reviews').insert({
        question_id: data.id,
        user_id: user.id,
        status: 'nouveau',
        success_streak: 0,
        next_review_at: new Date().toISOString(),
      })
      if (reviewError) throw reviewError

      return data as Question
    },
    onSuccess: () => invalidateQuestionCaches(queryClient, chapterId),
  })
}

export function useUpdateQuestion(chapterId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, question, answer, questionType, accountingData, tableData }: QuestionInput & { id: string }) => {
      const { error } = await supabase
        .from('questions')
        .update({
          question,
          answer,
          question_type: questionType,
          accounting_data: accountingData,
          table_data: tableData,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateQuestionCaches(queryClient, chapterId),
  })
}

export function useToggleQuestionActive(chapterId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('questions').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateQuestionCaches(queryClient, chapterId),
  })
}

export function useToggleQuestionReverse(chapterId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, canReverse }: { id: string; canReverse: boolean }) => {
      const { error } = await supabase.from('questions').update({ can_reverse: canReverse }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateQuestionCaches(queryClient, chapterId),
  })
}

export function useDeleteQuestion(chapterId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateQuestionCaches(queryClient, chapterId),
  })
}
