import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Question, Sheet } from '../types/database'

export interface ExportOverviewChapter {
  id: string
  name: string
  sheetsCount: number
  questionsCount: number
}

export interface ExportOverviewSubject {
  id: string
  name: string
  chapters: ExportOverviewChapter[]
}

/** Matières/chapitres avec le nombre de fiches et de questions, pour l'écran de sélection de l'export. */
export function useExportOverview() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['export-overview', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ExportOverviewSubject[]> => {
      const [{ data: subjects, error: subjectsError }, { data: chapters, error: chaptersError }] = await Promise.all([
        supabase.from('subjects').select('id, name').eq('user_id', user!.id).order('position'),
        supabase.from('chapters').select('id, name, subject_id').eq('user_id', user!.id).order('position'),
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

export interface ExportChapterContent {
  subjectName: string
  chapterName: string
  sheets: Sheet[]
  questions: Question[]
}

/** Charge le contenu (fiches/questions) des chapitres sélectionnés pour générer l'export. */
export function useExportContent(
  chapterIds: string[],
  includeSheets: boolean,
  includeQuestions: boolean,
  enabled: boolean,
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['export-content', user?.id, chapterIds, includeSheets, includeQuestions],
    enabled: !!user && enabled && chapterIds.length > 0,
    queryFn: async (): Promise<ExportChapterContent[]> => {
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, name, subject:subjects!inner ( name )')
        .in('id', chapterIds)
        .eq('user_id', user!.id)
      if (chaptersError) throw chaptersError

      const [{ data: sheets, error: sheetsError }, { data: questions, error: questionsError }] = await Promise.all([
        includeSheets
          ? supabase.from('sheets').select('*').in('chapter_id', chapterIds).eq('user_id', user!.id)
          : Promise.resolve({ data: [], error: null }),
        includeQuestions
          ? supabase.from('questions').select('*').in('chapter_id', chapterIds).eq('user_id', user!.id)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (sheetsError) throw sheetsError
      if (questionsError) throw questionsError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((chapters ?? []) as any[]).map((chapter) => ({
        subjectName: chapter.subject.name,
        chapterName: chapter.name,
        sheets: ((sheets ?? []) as Sheet[]).filter((s) => s.chapter_id === chapter.id),
        questions: ((questions ?? []) as Question[]).filter((q) => q.chapter_id === chapter.id),
      }))
    },
  })
}
