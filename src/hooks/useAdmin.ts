import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export interface AdminProfile {
  id: string
  email: string | null
}

export interface AdminChapterOverview {
  id: string
  name: string
  sheetsCount: number
  questionsCount: number
}

export interface AdminSubjectOverview {
  id: string
  name: string
  chapters: AdminChapterOverview[]
}

export function useIsAdmin() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
  })
}

export function useAdminSearchUsers(email: string) {
  const { user } = useAuth()
  const query = email.trim()

  return useQuery({
    queryKey: ['admin-search-users', query],
    enabled: !!user && query.length >= 2,
    queryFn: async (): Promise<AdminProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', `%${query}%`)
        .order('email')
        .limit(20)
      if (error) throw error
      return data as AdminProfile[]
    },
  })
}

export function useAdminUserOverview(targetUserId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['admin-user-overview', targetUserId],
    enabled: !!user && !!targetUserId,
    queryFn: async (): Promise<AdminSubjectOverview[]> => {
      const [{ data: subjects, error: subjectsError }, { data: chapters, error: chaptersError }] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name')
          .eq('user_id', targetUserId as string)
          .order('position'),
        supabase
          .from('chapters')
          .select('id, name, subject_id')
          .eq('user_id', targetUserId as string)
          .order('position'),
      ])
      if (subjectsError) throw subjectsError
      if (chaptersError) throw chaptersError

      const chapterIds = (chapters ?? []).map((c) => c.id)

      const [{ data: sheets, error: sheetsError }, { data: questions, error: questionsError }] = await Promise.all([
        chapterIds.length
          ? supabase.from('sheets').select('chapter_id').in('chapter_id', chapterIds)
          : Promise.resolve({ data: [], error: null }),
        chapterIds.length
          ? supabase.from('questions').select('chapter_id').in('chapter_id', chapterIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (sheetsError) throw sheetsError
      if (questionsError) throw questionsError

      const sheetsCount = new Map<string, number>()
      for (const s of sheets ?? []) sheetsCount.set(s.chapter_id, (sheetsCount.get(s.chapter_id) ?? 0) + 1)
      const questionsCount = new Map<string, number>()
      for (const q of questions ?? []) questionsCount.set(q.chapter_id, (questionsCount.get(q.chapter_id) ?? 0) + 1)

      return (subjects ?? []).map((subject) => ({
        id: subject.id,
        name: subject.name,
        chapters: (chapters ?? [])
          .filter((c) => c.subject_id === subject.id)
          .map((c) => ({
            id: c.id,
            name: c.name,
            sheetsCount: sheetsCount.get(c.id) ?? 0,
            questionsCount: questionsCount.get(c.id) ?? 0,
          })),
      }))
    },
  })
}
