import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { AccountingData, Question, QuestionType } from '../types/database'

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
  canReverse: boolean
}

export function useCreateQuestion(chapterId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ question, answer, questionType, accountingData, canReverse }: QuestionInput) => {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', chapterId] }),
  })
}

export function useUpdateQuestion(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, question, answer, questionType, accountingData }: QuestionInput & { id: string }) => {
      const { error } = await supabase
        .from('questions')
        .update({ question, answer, question_type: questionType, accounting_data: accountingData })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', chapterId] }),
  })
}

export function useToggleQuestionActive(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('questions').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', chapterId] }),
  })
}

export function useToggleQuestionReverse(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, canReverse }: { id: string; canReverse: boolean }) => {
      const { error } = await supabase.from('questions').update({ can_reverse: canReverse }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', chapterId] }),
  })
}

export function useDeleteQuestion(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', chapterId] }),
  })
}
