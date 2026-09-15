import { useNavigate } from 'react-router-dom'
import { ListPlus, PlayCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useDueOverview } from '../../hooks/useQuiz'

export default function QuestionsHome() {
  const navigate = useNavigate()
  const { data: overview } = useDueOverview()

  return (
    <div>
      <PageHeader title="Questions" subtitle="Créez vos questions ou lancez un quizz" />
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <button
          onClick={() => navigate('/questions/creer')}
          className="flex flex-col items-start gap-3 bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-brand-300 hover:shadow-sm transition"
        >
          <ListPlus className="text-brand-500" size={28} />
          <div>
            <p className="font-semibold text-slate-900">Créer des questions</p>
            <p className="text-sm text-slate-400 mt-0.5">Ajoutez vos questions/réponses par matière et chapitre.</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/questions/quizz')}
          className="relative flex flex-col items-start gap-3 bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-brand-300 hover:shadow-sm transition"
        >
          <PlayCircle className="text-brand-500" size={28} />
          <div>
            <p className="font-semibold text-slate-900">Quizz</p>
            <p className="text-sm text-slate-400 mt-0.5">Commencez une session de révision.</p>
          </div>
          {!!overview?.total && (
            <span className="absolute top-4 right-4 bg-brand-600 text-white text-xs font-semibold rounded-full h-6 min-w-6 px-1.5 flex items-center justify-center">
              {overview.total}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
