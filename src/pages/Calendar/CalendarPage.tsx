import { useMemo, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle, Circle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useCalendarQuestions } from '../../hooks/useCalendar'
import { useMotionPreferences } from '../../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition, revealVariants, directionalVariants } from '../../lib/motionTokens'
import type { ReviewStatus } from '../../types/database'

const STATUS_META: Record<ReviewStatus, { label: string; dot: string; text: string; Icon: typeof Circle }> = {
  nouveau: { label: 'Nouveau', dot: 'bg-slate-400', text: 'text-slate-500', Icon: Circle },
  reussi: { label: 'Validé', dot: 'bg-success-500', text: 'text-success-600', Icon: CheckCircle2 },
  apprentissage: { label: 'En apprentissage', dot: 'bg-warning-500', text: 'text-warning-600', Icon: Clock },
  echec: { label: 'Échoué', dot: 'bg-danger-500', text: 'text-danger-600', Icon: XCircle },
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function toDateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA') // yyyy-mm-dd, en heure locale
}

function toDateKeyFromDate(d: Date) {
  return d.toLocaleDateString('en-CA')
}

export default function CalendarPage() {
  const { data: questions, isLoading } = useCalendarQuestions()
  const { reducedMotion } = useMotionPreferences()
  const transition = reducedMotion ? reducedMotionTransition : springs.default
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKeyFromDate(new Date()))
  // -1 = mois précédent, 1 = mois suivant : direction du glissement du mini-calendrier.
  const [monthDirection, setMonthDirection] = useState(0)

  function goToMonth(delta: number) {
    setMonthDirection(delta)
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  const monthVariants = directionalVariants(28, reducedMotion)
  const rVariants = revealVariants(reducedMotion)

  const byDate = useMemo(() => {
    const map = new Map<string, typeof questions>()
    for (const q of questions ?? []) {
      const key = toDateKey(q.next_review_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(q)
    }
    return map
  }, [questions])

  const weeks = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    // Lundi = 0 ... Dimanche = 6
    const startOffset = (firstOfMonth.getDay() + 6) % 7
    const gridStart = new Date(year, month, 1 - startOffset)

    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      days.push(d)
    }

    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7))
    return result
  }, [cursor])

  const todayKey = toDateKeyFromDate(new Date())
  const selectedQuestions = byDate.get(selectedDate) ?? []

  return (
    <div>
      <PageHeader
        title="Calendrier"
        subtitle="Questions programmées"
        actions={
          <div className="flex items-center gap-1">
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.9 }}
              onClick={() => goToMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ChevronLeft size={18} />
            </m.button>
            <span className="text-sm font-medium text-slate-700 w-32 text-center capitalize overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
                <m.span
                  key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
                  custom={monthDirection}
                  variants={monthVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="inline-block"
                >
                  {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </m.span>
              </AnimatePresence>
            </span>
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.9 }}
              onClick={() => goToMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ChevronRight size={18} />
            </m.button>
          </div>
        }
      />

      <div className="p-5 space-y-5">
        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400 border-b border-slate-100">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
            <m.div
              key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
              custom={monthDirection}
              variants={monthVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                  {week.map((day) => {
                    const key = toDateKeyFromDate(day)
                    const dayQuestions = byDate.get(key) ?? []
                    const inMonth = day.getMonth() === cursor.getMonth()
                    const counts: Record<ReviewStatus, number> = { nouveau: 0, reussi: 0, apprentissage: 0, echec: 0 }
                    dayQuestions.forEach((q) => counts[q.status]++)

                    return (
                      <m.button
                        key={key}
                        whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                        onClick={() => setSelectedDate(key)}
                        className={`min-h-[64px] p-1.5 text-left border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors ${
                          selectedDate === key ? 'bg-brand-50' : ''
                        } ${!inMonth ? 'opacity-40' : ''}`}
                      >
                        <span
                          className={`text-xs inline-flex items-center justify-center w-5 h-5 rounded-full ${
                            key === todayKey ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {dayQuestions.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {(Object.keys(counts) as ReviewStatus[]).map(
                              (status) =>
                                counts[status] > 0 && (
                                  <span
                                    key={status}
                                    className={`w-1.5 h-1.5 rounded-full ${STATUS_META[status].dot}`}
                                    title={`${STATUS_META[status].label}: ${counts[status]}`}
                                  />
                                ),
                            )}
                          </div>
                        )}
                      </m.button>
                    )
                  })}
                </div>
              ))}
            </m.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={selectedDate}
            initial={rVariants.initial}
            animate={rVariants.animate}
            exit={rVariants.exit}
            transition={transition}
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              <span className="text-slate-400 font-normal"> · {selectedQuestions.length} question(s)</span>
            </h3>

            {selectedQuestions.length === 0 && (
              <p className="text-sm text-slate-400">Aucune question programmée ce jour-là.</p>
            )}

            <div className="space-y-2">
              {selectedQuestions.map((q) => {
                const meta = STATUS_META[q.status]
                const Icon = meta.Icon
                return (
                  <div
                    key={q.question_id}
                    className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3"
                  >
                    <Icon className={`${meta.text} mt-0.5 shrink-0`} size={16} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{q.question}</p>
                      <p className="text-xs text-slate-400">
                        {q.subject_name} · {q.chapter_name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
