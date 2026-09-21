import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { QuizResult } from '../types/database'

interface ResultCounts {
  reussi: number
  apprentissage: number
  echec: number
  total: number
}

export interface GroupStats extends ResultCounts {
  id: string
  name: string
  subLabel?: string
}

export interface DayStats extends ResultCounts {
  date: string
}

export interface StatsData {
  overall: ResultCounts
  bySubject: GroupStats[]
  byChapter: GroupStats[]
  byDay: DayStats[]
}

function emptyCounts(): ResultCounts {
  return { reussi: 0, apprentissage: 0, echec: 0, total: 0 }
}

function add(counts: ResultCounts, result: QuizResult) {
  counts[result] += 1
  counts.total += 1
}

export function useStats(daysWindow = 30, targetUserId?: string) {
  const { user } = useAuth()
  const scopedUserId = targetUserId ?? user?.id

  return useQuery({
    queryKey: ['stats', scopedUserId, daysWindow],
    enabled: !!user && !!scopedUserId,
    queryFn: async (): Promise<StatsData> => {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select(
          `result, answered_at, chapter_id, subject_id,
           chapter:chapters!inner ( name ),
           subject:subjects!inner ( name )`,
        )
        .eq('user_id', scopedUserId as string)
        .order('answered_at', { ascending: true })

      if (error) throw error

      const overall = emptyCounts()
      const subjectMap = new Map<string, GroupStats>()
      const chapterMap = new Map<string, GroupStats>()
      const dayMap = new Map<string, DayStats>()

      const today = new Date()
      for (let i = daysWindow - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dayMap.set(key, { date: key, ...emptyCounts() })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of data as any[]) {
        const result = row.result as QuizResult
        add(overall, result)

        if (!subjectMap.has(row.subject_id)) {
          subjectMap.set(row.subject_id, { id: row.subject_id, name: row.subject.name, ...emptyCounts() })
        }
        add(subjectMap.get(row.subject_id)!, result)

        if (!chapterMap.has(row.chapter_id)) {
          chapterMap.set(row.chapter_id, {
            id: row.chapter_id,
            name: row.chapter.name,
            subLabel: row.subject.name,
            ...emptyCounts(),
          })
        }
        add(chapterMap.get(row.chapter_id)!, result)

        const dayKey = (row.answered_at as string).slice(0, 10)
        if (dayMap.has(dayKey)) {
          add(dayMap.get(dayKey)!, result)
        }
      }

      return {
        overall,
        bySubject: Array.from(subjectMap.values()).sort((a, b) => b.total - a.total),
        byChapter: Array.from(chapterMap.values()).sort((a, b) => b.total - a.total),
        byDay: Array.from(dayMap.values()),
      }
    },
  })
}
