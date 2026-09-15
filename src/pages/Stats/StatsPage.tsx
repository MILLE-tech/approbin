import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import StackedBar, { StatusLegend } from '../../components/StackedBar'
import { useStats } from '../../hooks/useStats'

const CHART_HEIGHT = 120

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

export default function StatsPage() {
  const [windowDays, setWindowDays] = useState(30)
  const { data: stats, isLoading } = useStats(windowDays)

  if (isLoading || !stats) {
    return (
      <div>
        <PageHeader title="Statistiques" />
        <p className="p-5 text-sm text-slate-400">Chargement…</p>
      </div>
    )
  }

  const { overall, bySubject, byChapter, byDay } = stats
  const maxDayTotal = Math.max(1, ...byDay.map((d) => d.total))

  return (
    <div>
      <PageHeader title="Statistiques" subtitle="Vos performances aux quiz" />
      <div className="p-5 space-y-8 max-w-3xl">
        {/* Vue d'ensemble */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Vue d'ensemble ({overall.total} réponses)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-success-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-success-600">{pct(overall.reussi, overall.total)}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Validé ({overall.reussi})</p>
            </div>
            <div className="bg-warning-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-warning-600">{pct(overall.apprentissage, overall.total)}%</p>
              <p className="text-xs text-slate-500 mt-0.5">En apprentissage ({overall.apprentissage})</p>
            </div>
            <div className="bg-danger-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-danger-600">{pct(overall.echec, overall.total)}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Échoué ({overall.echec})</p>
            </div>
          </div>
        </section>

        {/* Activité journalière */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Activité par jour</h3>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600"
            >
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-end gap-[3px]" style={{ height: CHART_HEIGHT }}>
              {byDay.map((day) => {
                const scale = day.total === 0 ? 0 : (day.total / maxDayTotal) * CHART_HEIGHT
                const rH = day.total === 0 ? 0 : (day.reussi / day.total) * scale
                const aH = day.total === 0 ? 0 : (day.apprentissage / day.total) * scale
                const eH = day.total === 0 ? 0 : (day.echec / day.total) * scale
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col-reverse gap-[2px] min-w-[2px]"
                    title={`${day.date} — Validé: ${day.reussi}, Apprentissage: ${day.apprentissage}, Échoué: ${day.echec}`}
                  >
                    {rH > 0 && <div className="bg-success-500 rounded-t-[2px]" style={{ height: rH }} />}
                    {aH > 0 && <div className="bg-warning-500" style={{ height: aH }} />}
                    {eH > 0 && <div className="bg-danger-500" style={{ height: eH }} />}
                  </div>
                )
              })}
            </div>
            <div className="mt-3">
              <StatusLegend />
            </div>
          </div>
        </section>

        {/* Par matière */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Par matière</h3>
          {bySubject.length === 0 && <p className="text-sm text-slate-400">Pas encore de données.</p>}
          <div className="space-y-3">
            {bySubject.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.total} réponses</p>
                </div>
                <StackedBar reussi={s.reussi} apprentissage={s.apprentissage} echec={s.echec} total={s.total} />
              </div>
            ))}
          </div>
        </section>

        {/* Par chapitre */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Par chapitre</h3>
          {byChapter.length === 0 && <p className="text-sm text-slate-400">Pas encore de données.</p>}
          <div className="space-y-3">
            {byChapter.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.subLabel}</p>
                  </div>
                  <p className="text-xs text-slate-400">{c.total} réponses</p>
                </div>
                <StackedBar reussi={c.reussi} apprentissage={c.apprentissage} echec={c.echec} total={c.total} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
