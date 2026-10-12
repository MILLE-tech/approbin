import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import QuestionRow from '../../components/QuestionRow'
import {
  useDeleteQuestion,
  useQuestionSearch,
  useToggleQuestionActive,
  useToggleQuestionReverse,
  useUpdateQuestion,
} from '../../hooks/useQuestions'

export default function QuestionsSearch() {
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useQuestionSearch(query)
  const updateQuestion = useUpdateQuestion()
  const toggleActive = useToggleQuestionActive()
  const toggleReverse = useToggleQuestionReverse()
  const deleteQuestion = useDeleteQuestion()

  return (
    <div>
      <PageHeader title="Recherche" subtitle="Retrouvez une question dans toutes vos matières" back />
      <div className="p-5 max-w-2xl space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un mot dans vos questions ou réponses…"
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="text-xs text-slate-400">Entrez au moins 2 caractères.</p>
        )}
        {isLoading && <p className="text-sm text-slate-400">Recherche…</p>}
        {!isLoading && query.trim().length >= 2 && results?.length === 0 && (
          <p className="text-sm text-slate-400">Aucune question ne correspond à « {query.trim()} ».</p>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {results?.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                subjectName={q.subject_name}
                chapterName={q.chapter_name}
                onUpdate={(input) => updateQuestion.mutateAsync(input)}
                onToggleActive={(active) => toggleActive.mutate({ id: q.id, active })}
                onToggleReverse={(canReverse) => toggleReverse.mutate({ id: q.id, canReverse })}
                onDelete={() => deleteQuestion.mutate(q.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
