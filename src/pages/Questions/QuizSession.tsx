import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AccountingTable, { emptyAccountingData } from '../../components/AccountingTable'
import { useQuizQueue, useSubmitQuizAnswer, type DueRow } from '../../hooks/useQuiz'
import type { AccountingData, QuizResult } from '../../types/database'

type QueueItem = DueRow & { _reversed: boolean }

function rollReversed(row: DueRow): boolean {
  return row.can_reverse && Math.random() < 0.25
}

export default function QuizSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const chapterIds = (location.state as { chapterIds?: string[] } | null)?.chapterIds ?? null

  const { data: initialQueue, isLoading } = useQuizQueue(chapterIds, true)
  const submitAnswer = useSubmitQuizAnswer()

  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [accountingAnswer, setAccountingAnswer] = useState<AccountingData>(emptyAccountingData())
  const [revealed, setRevealed] = useState(false)
  const [answeredCount, setAnsweredCount] = useState(0)

  useEffect(() => {
    if (initialQueue && queue === null) {
      setQueue(initialQueue.map((row) => ({ ...row, _reversed: rollReversed(row) })))
    }
  }, [initialQueue, queue])

  const current = queue?.[0] ?? null

  function handleReveal() {
    setRevealed(true)
  }

  async function handleResult(result: QuizResult) {
    if (!current) return
    await submitAnswer.mutateAsync({
      questionId: current.question_id,
      chapterId: current.chapter_id,
      subjectId: current.subject_id,
      currentStreak: current.success_streak,
      result,
    })

    setQueue((prev) => {
      const rest = (prev ?? []).slice(1)
      // Échoué : la question revient simplement en fin de file de la session (pas de minuteur).
      if (result === 'echec') {
        return [...rest, { ...current, _reversed: rollReversed(current) }]
      }
      return rest
    })
    setUserAnswer('')
    setAccountingAnswer(emptyAccountingData())
    setRevealed(false)
    setAnsweredCount((c) => c + 1)
  }

  if (isLoading || queue === null) {
    return <p className="p-5 text-sm text-slate-400">Chargement du quizz…</p>
  }

  if (!current) {
    return (
      <div>
        <PageHeader title="Quizz" back />
        <div className="p-8 text-center max-w-md mx-auto">
          <CheckCircle2 className="text-success-500 mx-auto mb-3" size={40} />
          <p className="text-lg font-semibold text-slate-900">Session terminée !</p>
          <p className="text-sm text-slate-500 mt-1">
            {answeredCount} question{answeredCount > 1 ? 's' : ''} traitée{answeredCount > 1 ? 's' : ''}.
          </p>
          <button
            onClick={() => navigate('/questions')}
            className="mt-5 rounded-lg bg-brand-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-brand-700"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  const isAccounting = current.question_type === 'accounting' && !current._reversed
  const prompt = current._reversed ? current.answer : current.question
  const correctAnswerText = current._reversed ? current.question : current.answer

  return (
    <div>
      <PageHeader
        title={current.subject_name}
        subtitle={current.chapter_name}
        back
        actions={<span className="text-xs text-slate-400">{queue.length} restante(s)</span>}
      />
      <div className="p-5 max-w-xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {current._reversed && (
            <p className="text-[11px] font-medium text-brand-600 uppercase mb-1.5">Question inversée</p>
          )}
          <p className="text-base font-medium text-slate-900">{prompt}</p>
        </div>

        {isAccounting ? (
          <AccountingTable data={accountingAnswer} onChange={setAccountingAnswer} readOnly={revealed} />
        ) : (
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Votre réponse…"
            rows={4}
            disabled={revealed}
            className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
          />
        )}

        {!revealed ? (
          <button
            onClick={handleReveal}
            className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 text-sm hover:bg-brand-700"
          >
            Valider ma réponse
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs font-medium text-brand-700 mb-2">Réponse enregistrée</p>
              {isAccounting && current.accounting_data ? (
                <AccountingTable data={current.accounting_data} readOnly />
              ) : (
                <p className="text-sm text-slate-700">{correctAnswerText}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleResult('reussi')}
                className="flex flex-col items-center gap-1 rounded-lg bg-success-500 text-white py-3 text-xs font-semibold hover:bg-success-600"
              >
                <CheckCircle2 size={18} />
                Validé
              </button>
              <button
                onClick={() => handleResult('apprentissage')}
                className="flex flex-col items-center gap-1 rounded-lg bg-warning-500 text-white py-3 text-xs font-semibold hover:bg-warning-600"
              >
                <Clock size={18} />
                En apprentissage
              </button>
              <button
                onClick={() => handleResult('echec')}
                className="flex flex-col items-center gap-1 rounded-lg bg-danger-500 text-white py-3 text-xs font-semibold hover:bg-danger-600"
              >
                <XCircle size={18} />
                Échoué
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
