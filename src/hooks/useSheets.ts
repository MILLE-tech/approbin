import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, SHEETS_BUCKET } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Sheet } from '../types/database'

export function useSheets(chapterId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['sheets', chapterId],
    enabled: !!user && !!chapterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('chapter_id', chapterId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Sheet[]
    },
  })
}

export function useCreateManualSheet(chapterId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!user || !chapterId) throw new Error('Contexte invalide')
      const { data, error } = await supabase
        .from('sheets')
        .insert({ title, content, chapter_id: chapterId, user_id: user.id, source_type: 'manual' })
        .select()
        .single()
      if (error) throw error
      return data as Sheet
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheets', chapterId] }),
  })
}

export function useImportSheet(chapterId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, file }: { title: string; file: File }) => {
      if (!user || !chapterId) throw new Error('Contexte invalide')
      const path = `${user.id}/${chapterId}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage.from(SHEETS_BUCKET).upload(path, file)
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('sheets')
        .insert({
          title,
          chapter_id: chapterId,
          user_id: user.id,
          source_type: 'import',
          file_path: path,
          file_name: file.name,
          file_mime: file.type,
        })
        .select()
        .single()
      if (error) throw error
      return data as Sheet
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheets', chapterId] }),
  })
}

export function useUpdateSheetContent(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from('sheets')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheets', chapterId] }),
  })
}

export function useDeleteSheet(chapterId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sheet: Sheet) => {
      if (sheet.file_path) {
        await supabase.storage.from(SHEETS_BUCKET).remove([sheet.file_path])
      }
      const { error } = await supabase.from('sheets').delete().eq('id', sheet.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheets', chapterId] }),
  })
}

export async function getSheetFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(SHEETS_BUCKET).createSignedUrl(filePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}
