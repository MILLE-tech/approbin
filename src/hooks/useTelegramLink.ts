import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { TelegramLink } from '../types/database'

function generateLinkCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export function useTelegramLink(poll = false) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['telegram-link', user?.id],
    enabled: !!user,
    refetchInterval: poll ? 4000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as TelegramLink | null
    },
  })
}

export function useGenerateTelegramLinkCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non connecté')
      const code = generateLinkCode()
      const { error } = await supabase
        .from('telegram_links')
        .upsert({ user_id: user.id, link_code: code, reminder_enabled: true }, { onConflict: 'user_id' })
      if (error) throw error
      return code
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram-link', user?.id] }),
  })
}

export function useSetReminderEnabled() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Non connecté')
      const { error } = await supabase.from('telegram_links').update({ reminder_enabled: enabled }).eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram-link', user?.id] }),
  })
}

export function useUnlinkTelegram() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non connecté')
      const { error } = await supabase
        .from('telegram_links')
        .update({ chat_id: null, link_code: null })
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram-link', user?.id] }),
  })
}
