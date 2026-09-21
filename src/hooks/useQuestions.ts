import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Question } from '../types/database'

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

export function useCreateQuestion(chapterId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ question, answer }: { question: string; answer: string }) => {
      if (!user || !chapterId) throw new Error('Contexte invalide')
      const { data, error } = await supabase
        .from('questions')
        .insert({ question, answer, chapter_id: chapterId, user_id: user.id })
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
    mutationFn: async ({ id, question, answer }: { id: string; question: string; answer: string }) => {
      const { error } = await supabase.from('questions').update({ question, answer }).eq('id', id)
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
