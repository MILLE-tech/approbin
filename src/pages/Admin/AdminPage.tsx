import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Search, ShieldCheck, User } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import StackedBar from '../../components/StackedBar'
import { useAdminSearchUsers, useAdminUserOverview, useIsAdmin } from '../../hooks/useAdmin'
import { useStats } from '../../hooks/useStats'

export default function AdminPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin()
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<string>('')

  const { data: results, isLoading: searching } = useAdminSearchUsers(query)
  const { data: overview, isLoading: loadingOverview } = useAdminUserOverview(selectedUserId)
  const { data: stats, isLoading: loadingStats } = useStats(30, selectedUserId ?? undefined)

  if (checkingAdmin) {
    return <p className="p-5 text-sm text-slate-400">Chargement…</p>
  }

  if (!isAdmin) {
    return <Navigate to="/fiches" replace />
  }

  return (
    <div>
      <PageHeader title="Admin" subtitle="Consultation en lecture seule des données utilisateur" />
      <div className="p-5 space-y-5 max-w-3xl">
        <div className="flex items-center gap-2 text-xs text-warning-700 bg-warning-50 rounded-lg px-3 py-2">
          <ShieldCheck size={14} />
          Accès lecture seule — aucune modification possible depuis cet écran.
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un utilisateur par email…"
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {searching && <p className="text-sm text-slate-400">Recherche…</p>}

        {results && results.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedUserId(r.id)
                  setSelectedEmail(r.email ?? '')
                }}
                className={`w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm hover:bg-slate-50 ${
                  selectedUserId === r.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                }`}
              >
                <User size={14} />
                {r.email}
              </button>
            ))}
          </div>
        )}

        {selectedUserId && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-800">{selectedEmail}</h3>

            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Matières et chapitres</h4>
              {loadingOverview && <p className="text-sm text-slate-400">Chargement…</p>}
              {overview && overview.length === 0 && (
                <p className="text-sm text-slate-400">Aucune matière créée par cet utilisateur.</p>
              )}
              <div className="space-y-3">
                {overview?.map((subject) => (
                  <div key={subject.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-800 mb-2">{subject.name}</p>
                    {subject.chapters.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucun chapitre.</p>
                    ) : (
                      <ul className="space-y-1">
                        {subject.chapters.map((c) => (
                          <li key={c.id} className="flex items-center justify-between text-xs text-slate-500">
                            <span>{c.name}</span>
                            <span>
                              {c.sheetsCount} fiche{c.sheetsCount > 1 ? 's' : ''} · {c.questionsCount} question
                              {c.questionsCount > 1 ? 's' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Statistiques de quizz (30 derniers jours)</h4>
              {loadingStats && <p className="text-sm text-slate-400">Chargement…</p>}
              {stats && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">{stats.overall.total} réponses au total</p>
                  <StackedBar
                    reussi={stats.overall.reussi}
                    apprentissage={stats.overall.apprentissage}
                    echec={stats.overall.echec}
                    total={stats.overall.total}
                  />
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
