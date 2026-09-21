import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Chapter } from '../types/database'

export function useChapters(subjectId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chapters', subjectId],
    enabled: !!user && !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', subjectId as string)
        .eq('user_id', user!.id)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Chapter[]
    },
  })
}

export function useChapter(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chapter', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', id as string)
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as Chapter
    },
  })
}

export function useCreateChapter(subjectId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user || !subjectId) throw new Error('Contexte invalide')
      const { data, error } = await supabase
        .from('chapters')
        .insert({ name, subject_id: subjectId, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Chapter
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] }),
  })
}

export function useRenameChapter(subjectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('chapters').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] }),
  })
}

export function useDeleteChapter(subjectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chapters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] }),
  })
}
