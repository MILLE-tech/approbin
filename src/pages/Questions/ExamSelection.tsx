import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useExamOverview } from '../../hooks/useExam'

export default function ExamSelection() {
  const navigate = useNavigate()
  const { data: overview, isLoading } = useExamOverview()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [length, setLength] = useState(15)

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

  const poolSize =
    selected.size === 0
      ? overview?.total ?? 0
      : overview?.subjects
          .flatMap((s) => s.chapters)
          .filter((c) => selected.has(c.id))
          .reduce((sum, c) => sum + c.count, 0) ?? 0

  function start() {
    const chapterIds = selected.size === 0 ? allChapterIds : Array.from(selected)
    navigate('/questions/examen/session', { state: { chapterIds, length } })
  }

  return (
    <div>
      <PageHeader title="Mode Examen" subtitle="Choisissez le périmètre (facultatif) et le nombre de questions" back />
      <div className="p-5 max-w-2xl space-y-5">
        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}

        {!isLoading && (overview?.total ?? 0) === 0 && (
          <p className="text-sm text-slate-400">Aucune question active pour le moment.</p>
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-xs">
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="length">
              Nombre de questions
            </label>
            <input
              id="length"
              type="number"
              min={1}
              max={100}
              value={length}
              onChange={(e) => setLength(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              {poolSize} question{poolSize > 1 ? 's' : ''} disponible{poolSize > 1 ? 's' : ''} dans ce périmètre — les
              questions peuvent revenir plusieurs fois si le nombre demandé dépasse ce total.
            </p>
          </div>
        )}

        {(overview?.total ?? 0) > 0 && poolSize > 0 && (
          <button
            onClick={start}
            className="w-full sm:w-auto rounded-lg bg-brand-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-brand-700"
          >
            Commencer l'examen
          </button>
        )}
      </div>
    </div>
  )
}
