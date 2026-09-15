import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useDueOverview } from '../../hooks/useQuiz'

export default function QuizSelection() {
  const navigate = useNavigate()
  const { data: overview, isLoading } = useDueOverview()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allChapterIds = useMemo(
    () => overview?.subjects.flatMap((s) => s.chapters.map((c) => c.id)) ?? [],
    [overview],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCount = selected.size === 0
    ? overview?.total ?? 0
    : overview?.subjects
        .flatMap((s) => s.chapters)
        .filter((c) => selected.has(c.id))
        .reduce((sum, c) => sum + c.count, 0) ?? 0

  function start() {
    const chapterIds = selected.size === 0 ? allChapterIds : Array.from(selected)
    navigate('/questions/quizz/session', { state: { chapterIds } })
  }

  return (
    <div>
      <PageHeader title="Quizz" subtitle="Sélectionnez ce que vous voulez réviser (facultatif)" back />
      <div className="p-5 max-w-2xl space-y-5">
        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}

        {!isLoading && (overview?.total ?? 0) === 0 && (
          <p className="text-sm text-slate-400">Aucune question à réviser pour le moment. Revenez plus tard !</p>
        )}

        {overview?.subjects.map((subject) => (
          <div key={subject.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              {subject.name} <span className="text-slate-400 font-normal">({subject.count})</span>
            </p>
            <div className="space-y-1.5">
              {subject.chapters.map((chapter) => (
                <label key={chapter.id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(chapter.id)}
                    onChange={() => toggle(chapter.id)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {chapter.name}
                  <span className="text-slate-400">({chapter.count})</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {(overview?.total ?? 0) > 0 && (
          <button
            onClick={start}
            className="w-full sm:w-auto rounded-lg bg-brand-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-brand-700"
          >
            Commencer le quizz ({selectedCount} question{selectedCount > 1 ? 's' : ''})
          </button>
        )}
      </div>
    </div>
  )
}
