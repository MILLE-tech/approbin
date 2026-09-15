import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useQuizQueue, useSubmitQuizAnswer, type DueRow } from '../../hooks/useQuiz'
import type { QuizResult } from '../../types/database'

interface PendingRetry {
  row: DueRow
  readyAt: number
}

export default function QuizSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const chapterIds = (location.state as { chapterIds?: string[] } | null)?.chapterIds ?? null

  const { data: initialQueue, isLoading } = useQuizQueue(chapterIds, true)
  const submitAnswer = useSubmitQuizAnswer()

  const [queue, setQueue] = useState<DueRow[] | null>(null)
  const [pendingRetry, setPendingRetry] = useState<PendingRetry[]>([])
  const [userAnswer, setUserAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (initialQueue && queue === null) setQueue(initialQueue)
  }, [initialQueue, queue])

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const current = queue?.[0] ?? null

  const nextReadyIn = useMemo(() => {
    if (queue?.length || pendingRetry.length === 0) return null
    const earliest = Math.min(...pendingRetry.map((p) => p.readyAt))
    return Math.max(0, Math.ceil((earliest - Date.now()) / 1000))
  }, [queue, pendingRetry, tick])

  useEffect(() => {
    if (queue?.length === 0 && pendingRetry.length > 0) {
      const now = Date.now()
      const ready = pendingRetry.filter((p) => p.readyAt <= now)
      if (ready.length > 0) {
        setPendingRetry((prev) => prev.filter((p) => p.readyAt > now))
        setQueue((prev) => [...(prev ?? []), ...ready.map((r) => r.row)])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

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

    if (result === 'echec') {
      setPendingRetry((prev) => [...prev, { row: current, readyAt: Date.now() + 5 * 60 * 1000 }])
    }

    setQueue((prev) => (prev ?? []).slice(1))
    setUserAnswer('')
    setRevealed(false)
    setAnsweredCount((c) => c + 1)
  }

  if (isLoading || queue === null) {
    return <p className="p-5 text-sm text-slate-400">Chargement du quizz…</p>
  }

  if (!current && pendingRetry.length === 0) {
    return (
      <div>
        <PageHeader title="Quizz" back />
        <div className="p-8 text-center max-w-md mx-auto">
          <CheckCircle2 className="text-success-500 mx-auto mb-3" size={40} />
          <p className="text-lg font-semibold text-slate-900">Session terminée !</p>
          <p className="text-sm text-slate-500 mt-1">{answeredCount} question{answeredCount > 1 ? 's' : ''} traitée{answeredCount > 1 ? 's' : ''}.</p>
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

  if (!current && pendingRetry.length > 0) {
    const minutes = Math.floor((nextReadyIn ?? 0) / 60)
    const seconds = (nextReadyIn ?? 0) % 60
    return (
      <div>
        <PageHeader title="Quizz" back />
        <div className="p-8 text-center max-w-md mx-auto">
          <Clock className="text-warning-500 mx-auto mb-3" size={36} />
          <p className="text-slate-700 font-medium">Prochaine question dans</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1 tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-slate-400 mt-2">Une question échouée revient dans 5 minutes.</p>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div>
      <PageHeader
        title={current.subject_name}
        subtitle={current.chapter_name}
        back
        actions={<span className="text-xs text-slate-400">{queue.length + pendingRetry.length} restante(s)</span>}
      />
      <div className="p-5 max-w-xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-base font-medium text-slate-900">{current.question}</p>
        </div>

        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Votre réponse…"
          rows={4}
          disabled={revealed}
          className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
        />

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
              <p className="text-xs font-medium text-brand-700 mb-1">Réponse enregistrée</p>
              <p className="text-sm text-slate-700">{current.answer}</p>
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
