import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Subject } from '../types/database'

export function useSubjects() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subjects', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Subject[]
    },
  })
}

export function useSubject(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subject', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as Subject
    },
  })
}

export function useCreateSubject() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Non connecté')
      const { data, error } = await supabase
        .from('subjects')
        .insert({ name, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Subject
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] }),
  })
}

export function useRenameSubject() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('subjects').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] }),
  })
}

export function useDeleteSubject() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] }),
  })
}
