import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle, Pencil, Power, Repeat, Check, X, Calculator, Table2, Type } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AccountingTable, { emptyAccountingData } from '../../components/AccountingTable'
import GenericTable, { blankCopyOf, emptyTableData } from '../../components/GenericTable'
import { useQuizQueue, useSubmitQuizAnswer, type DueRow } from '../../hooks/useQuiz'
import { useToggleQuestionActive, useToggleQuestionReverse, useUpdateQuestion } from '../../hooks/useQuestions'
import type { AccountingData, QuestionType, QuizResult, TableData } from '../../types/database'

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
  const updateQuestion = useUpdateQuestion()
  const toggleActive = useToggleQuestionActive()
  const toggleReverse = useToggleQuestionReverse()

  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [accountingAnswer, setAccountingAnswer] = useState<AccountingData>(emptyAccountingData())
  const [tableAnswer, setTableAnswer] = useState<TableData>(emptyTableData())
  const [revealed, setRevealed] = useState(false)
  const [answeredCount, setAnsweredCount] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [editType, setEditType] = useState<QuestionType>('text')
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editAccounting, setEditAccounting] = useState<AccountingData>(emptyAccountingData())
  const [editTable, setEditTable] = useState<TableData>(emptyTableData())

  useEffect(() => {
    if (initialQueue && queue === null) {
      setQueue(initialQueue.map((row) => ({ ...row, _reversed: rollReversed(row) })))
    }
  }, [initialQueue, queue])

  const current = queue?.[0] ?? null

  // Les entêtes du tableau doivent être visibles dès que la question est
  // posée (pas seulement après validation) : on prépare un tableau vide
  // avec les bonnes colonnes dès qu'une nouvelle question tableau arrive.
  useEffect(() => {
    if (current?.question_type === 'table' && !current._reversed && current.table_data) {
      setTableAnswer(blankCopyOf(current.table_data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.question_id, current?._reversed])

  function resetAnswerState() {
    setUserAnswer('')
    setAccountingAnswer(emptyAccountingData())
    setTableAnswer(emptyTableData())
    setRevealed(false)
    setIsEditing(false)
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
    resetAnswerState()
    setAnsweredCount((c) => c + 1)
  }

  function startEdit() {
    if (!current) return
    setEditType(current.question_type)
    setEditQuestion(current.question)
    setEditAnswer(current.answer)
    setEditAccounting(current.accounting_data ?? emptyAccountingData())
    setEditTable(current.table_data ?? emptyTableData())
    setIsEditing(true)
  }

  async function commitEdit() {
    if (!current || !editQuestion.trim()) return
    if (editType === 'text' && !editAnswer.trim()) return

    await updateQuestion.mutateAsync({
      id: current.question_id,
      question: editQuestion.trim(),
      answer: editType === 'text' ? editAnswer.trim() : '',
      questionType: editType,
      accountingData: editType === 'accounting' ? editAccounting : null,
      tableData: editType === 'table' ? editTable : null,
      canReverse: current.can_reverse,
    })

    setQueue((prev) =>
      (prev ?? []).map((item) =>
        item.question_id === current.question_id
          ? {
              ...item,
              question: editQuestion.trim(),
              answer: editType === 'text' ? editAnswer.trim() : '',
              question_type: editType,
              accounting_data: editType === 'accounting' ? editAccounting : null,
              table_data: editType === 'table' ? editTable : null,
            }
          : item,
      ),
    )
    setIsEditing(false)
  }

  function handleDeactivate() {
    if (!current) return
    toggleActive.mutate({ id: current.question_id, active: false })
    // Retire toutes les occurrences de cette question de la session en cours.
    setQueue((prev) => (prev ?? []).filter((item) => item.question_id !== current.question_id))
    resetAnswerState()
  }

  function handleToggleReverse() {
    if (!current) return
    toggleReverse.mutate({ id: current.question_id, canReverse: !current.can_reverse })
    setQueue((prev) =>
      (prev ?? []).map((item) => (item.question_id === current.question_id ? { ...item, can_reverse: !current.can_reverse } : item)),
    )
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
  const isTable = current.question_type === 'table' && !current._reversed
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
          <div className="flex items-start justify-between gap-2 mb-1.5">
            {current._reversed ? (
              <p className="text-[11px] font-medium text-brand-600 uppercase">Question inversée</p>
            ) : (
              <span />
            )}
            {revealed && !isEditing && (
              <div className="flex gap-1 shrink-0">
                <button onClick={startEdit} className="p-1 text-slate-400 hover:text-brand-600" title="Modifier">
                  <Pencil size={14} />
                </button>
                <button onClick={handleDeactivate} className="p-1 text-slate-400 hover:text-warning-600" title="Désactiver">
                  <Power size={14} />
                </button>
                <button
                  onClick={handleToggleReverse}
                  className={`p-1 ${current.can_reverse ? 'text-brand-600' : 'text-slate-400 hover:text-brand-600'}`}
                  title="Inverser question/réponse 1 fois sur 4"
                >
                  <Repeat size={14} />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
                {(['text', 'accounting', 'table'] as QuestionType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditType(t)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 ${
                      editType === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                    } ${t !== 'text' ? 'border-l border-slate-200' : ''}`}
                  >
                    {t === 'text' && <Type size={13} />}
                    {t === 'accounting' && <Calculator size={13} />}
                    {t === 'table' && <Table2 size={13} />}
                    {t === 'text' ? 'Texte' : t === 'accounting' ? 'Comptabilité' : 'Tableau'}
                  </button>
                ))}
              </div>
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                rows={2}
                className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
              />
              {editType === 'text' && (
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
                />
              )}
              {editType === 'accounting' && <AccountingTable data={editAccounting} onChange={setEditAccounting} />}
              {editType === 'table' && <GenericTable data={editTable} onChange={setEditTable} />}
              <div className="flex gap-2">
                <button onClick={commitEdit} className="text-success-600">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditing(false)} className="text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-base font-medium text-slate-900">{prompt}</p>
          )}
        </div>

        {!isEditing && (
          <>
            {isAccounting ? (
              <AccountingTable data={accountingAnswer} onChange={setAccountingAnswer} readOnly={revealed} />
            ) : isTable ? (
              <GenericTable data={tableAnswer} onChange={setTableAnswer} readOnly={revealed} lockStructure />
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
                Valider ma réponse
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-brand-700 mb-2">Réponse enregistrée</p>
                  {isAccounting && current.accounting_data ? (
                    <AccountingTable data={current.accounting_data} readOnly />
                  ) : isTable && current.table_data ? (
                    <GenericTable data={current.table_data} readOnly />
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
          </>
        )}
      </div>
    </div>
  )
}
