import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, RotateCcw, ThumbsDown, ThumbsUp, Trophy } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AccountingTable, { emptyAccountingData } from '../../components/AccountingTable'
import { useExamQuestionPool, type ExamQuestion } from '../../hooks/useExam'
import type { AccountingData } from '../../types/database'

interface Draw extends ExamQuestion {
  reversed: boolean
}

function drawQuestions(pool: ExamQuestion[], length: number): Draw[] {
  const draws: Draw[] = []
  for (let i = 0; i < length; i++) {
    const q = pool[Math.floor(Math.random() * pool.length)]
    draws.push({ ...q, reversed: q.can_reverse && Math.random() < 0.25 })
  }
  return draws
}

export default function ExamSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { chapterIds, length } = (location.state as { chapterIds?: string[]; length?: number } | null) ?? {}
  const examLength = length ?? 15

  const { data: pool, isLoading } = useExamQuestionPool(chapterIds ?? null, true)

  const [draws, setDraws] = useState<Draw[] | null>(null)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [accountingAnswer, setAccountingAnswer] = useState<AccountingData>(emptyAccountingData())
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (pool && pool.length > 0 && draws === null) {
      setDraws(drawQuestions(pool, examLength))
    }
  }, [pool, draws, examLength])

  function restart() {
    if (!pool || pool.length === 0) return
    setDraws(drawQuestions(pool, examLength))
    setIndex(0)
    setScore(0)
    setUserAnswer('')
    setAccountingAnswer(emptyAccountingData())
    setRevealed(false)
  }

  function grade(correct: boolean) {
    if (correct) setScore((s) => s + 1)
    setUserAnswer('')
    setAccountingAnswer(emptyAccountingData())
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (isLoading || (pool && pool.length > 0 && draws === null)) {
    return <p className="p-5 text-sm text-slate-400">Chargement de l'examen…</p>
  }

  if (!pool || pool.length === 0) {
    return (
      <div>
        <PageHeader title="Mode Examen" back />
        <p className="p-5 text-sm text-slate-400">Aucune question active dans ce périmètre.</p>
      </div>
    )
  }

  if (!draws) return null

  const finished = index >= draws.length

  if (finished) {
    return (
      <div>
        <PageHeader title="Mode Examen" back />
        <div className="p-8 text-center max-w-md mx-auto">
          <Trophy className="text-brand-500 mx-auto mb-3" size={40} />
          <p className="text-lg font-semibold text-slate-900">Examen fini !</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">
            {score} / {draws.length}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Ce résultat n'affecte ni votre calendrier ni la progression de vos questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <button
              onClick={restart}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-brand-700"
            >
              <RotateCcw size={16} />
              Refaire un examen
            </button>
            <button
              onClick={() => navigate('/questions')}
              className="rounded-lg border border-slate-200 text-slate-600 font-medium px-5 py-2.5 text-sm hover:bg-slate-50"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  const current = draws[index]
  const isAccounting = current.question_type === 'accounting' && !current.reversed
  const prompt = current.reversed ? current.answer : current.question
  const correctAnswerText = current.reversed ? current.question : current.answer

  return (
    <div>
      <PageHeader
        title={current.subject_name}
        subtitle={current.chapter_name}
        back
        actions={
          <span className="text-xs text-slate-400">
            {index + 1} / {draws.length} · Score {score}
          </span>
        }
      />
      <div className="p-5 max-w-xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {current.reversed && <p className="text-[11px] font-medium text-brand-600 uppercase mb-1.5">Question inversée</p>}
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
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 text-sm hover:bg-brand-700"
          >
            Voir la réponse
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs font-medium text-brand-700 mb-2 flex items-center gap-1">
                <CheckCircle2 size={13} />
                Bonne réponse
              </p>
              {isAccounting && current.accounting_data ? (
                <AccountingTable data={current.accounting_data} readOnly />
              ) : (
                <p className="text-sm text-slate-700">{correctAnswerText}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => grade(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-success-500 text-white py-3 text-sm font-semibold hover:bg-success-600"
              >
                <ThumbsUp size={16} />
                J'avais juste
              </button>
              <button
                onClick={() => grade(false)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-danger-500 text-white py-3 text-sm font-semibold hover:bg-danger-600"
              >
                <ThumbsDown size={16} />
                J'avais faux
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
