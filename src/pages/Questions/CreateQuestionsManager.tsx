import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, Check, X, Repeat, Power, Calculator, Type } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AccountingTable, { emptyAccountingData } from '../../components/AccountingTable'
import { useChapter } from '../../hooks/useChapters'
import {
  useCreateQuestion,
  useDeleteQuestion,
  useQuestions,
  useToggleQuestionActive,
  useToggleQuestionReverse,
  useUpdateQuestion,
} from '../../hooks/useQuestions'
import type { AccountingData, Question, QuestionType } from '../../types/database'

export default function CreateQuestionsManager() {
  const { chapterId } = useParams<{ subjectId: string; chapterId: string }>()
  const { data: chapter } = useChapter(chapterId)
  const { data: questions, isLoading } = useQuestions(chapterId)
  const createQuestion = useCreateQuestion(chapterId)
  const updateQuestion = useUpdateQuestion(chapterId)
  const deleteQuestion = useDeleteQuestion(chapterId)
  const toggleActive = useToggleQuestionActive(chapterId)
  const toggleReverse = useToggleQuestionReverse(chapterId)

  const [newType, setNewType] = useState<QuestionType>('text')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newAccounting, setNewAccounting] = useState<AccountingData>(emptyAccountingData())
  const [newCanReverse, setNewCanReverse] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<QuestionType>('text')
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editAccounting, setEditAccounting] = useState<AccountingData>(emptyAccountingData())

  async function handleAdd() {
    if (!newQuestion.trim()) return
    if (newType === 'text' && !newAnswer.trim()) return
    if (newType === 'accounting' && !newAccounting.date.trim()) return

    await createQuestion.mutateAsync({
      question: newQuestion.trim(),
      answer: newType === 'text' ? newAnswer.trim() : '',
      questionType: newType,
      accountingData: newType === 'accounting' ? newAccounting : null,
      canReverse: newType === 'text' && newCanReverse,
    })
    setNewQuestion('')
    setNewAnswer('')
    setNewAccounting(emptyAccountingData())
    setNewCanReverse(false)
  }

  function startEdit(q: Question) {
    setEditingId(q.id)
    setEditType(q.question_type)
    setEditQuestion(q.question)
    setEditAnswer(q.answer)
    setEditAccounting(q.accounting_data ?? emptyAccountingData())
  }

  async function commitEdit() {
    if (!editingId || !editQuestion.trim()) return
    if (editType === 'text' && !editAnswer.trim()) return

    await updateQuestion.mutateAsync({
      id: editingId,
      question: editQuestion.trim(),
      answer: editType === 'text' ? editAnswer.trim() : '',
      questionType: editType,
      accountingData: editType === 'accounting' ? editAccounting : null,
      canReverse: false, // non modifié ici, voir le bouton "Inverser" de la ligne
    })
    setEditingId(null)
  }

  return (
    <div>
      <PageHeader title={chapter?.name ?? 'Chapitre'} subtitle="Vos questions de quizz" back />
      <div className="p-5 max-w-2xl space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Nouvelle question</p>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              <button
                onClick={() => setNewType('text')}
                className={`flex items-center gap-1 px-2.5 py-1.5 ${
                  newType === 'text' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Type size={13} />
                Texte
              </button>
              <button
                onClick={() => setNewType('accounting')}
                className={`flex items-center gap-1 px-2.5 py-1.5 border-l border-slate-200 ${
                  newType === 'accounting' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Calculator size={13} />
                Comptabilité
              </button>
            </div>
          </div>

          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {newType === 'text' ? (
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Réponse"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ) : (
            <AccountingTable data={newAccounting} onChange={setNewAccounting} />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={createQuestion.isPending}
              className="flex items-center gap-1.5 text-sm font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              <Plus size={16} />
              Ajouter
            </button>

            {newType === 'text' && (
              <button
                onClick={() => setNewCanReverse((v) => !v)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border ${
                  newCanReverse
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title="1 fois sur 4, la question et la réponse seront inversées dans le quizz"
              >
                <Repeat size={15} />
                Inverser
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
        {!isLoading && questions?.length === 0 && (
          <p className="text-sm text-slate-400">Aucune question pour le moment.</p>
        )}

        <div className="space-y-3">
          {questions?.map((q) => (
            <div
              key={q.id}
              className={`border rounded-xl p-4 ${
                q.active ? 'bg-white border-slate-200' : 'bg-warning-50 border-warning-200'
              }`}
            >
              {editingId === q.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
                  />
                  {editType === 'text' ? (
                    <textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
                    />
                  ) : (
                    <AccountingTable data={editAccounting} onChange={setEditAccounting} />
                  )}
                  <div className="flex gap-2">
                    <button onClick={commitEdit} className="text-success-600">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {!q.active && (
                      <p className="text-[11px] font-medium text-warning-700 uppercase mb-1">Désactivée</p>
                    )}
                    {q.question_type === 'accounting' && (
                      <p className="flex items-center gap-1 text-[11px] font-medium text-brand-600 mb-1">
                        <Calculator size={12} />
                        Écriture comptable {q.accounting_data?.date && `· ${q.accounting_data.date}`}
                      </p>
                    )}
                    {q.can_reverse && (
                      <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-1">
                        <Repeat size={12} />
                        Inversion activée
                      </p>
                    )}
                    <p className="text-sm font-medium text-slate-800">{q.question}</p>
                    {q.question_type === 'text' && <p className="text-sm text-slate-500 mt-1">{q.answer}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(q)} className="p-1.5 text-slate-400 hover:text-brand-600" title="Modifier">
                      <Pencil size={15} />
                    </button>
                    {q.question_type === 'text' && (
                      <button
                        onClick={() => toggleReverse.mutate({ id: q.id, canReverse: !q.can_reverse })}
                        className={`p-1.5 ${q.can_reverse ? 'text-brand-600' : 'text-slate-400 hover:text-brand-600'}`}
                        title="Inverser question/réponse 1 fois sur 4"
                      >
                        <Repeat size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive.mutate({ id: q.id, active: !q.active })}
                      className={`p-1.5 ${q.active ? 'text-slate-400 hover:text-warning-600' : 'text-warning-600'}`}
                      title={q.active ? 'Désactiver' : 'Activer'}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      onClick={() => confirm('Supprimer cette question ?') && deleteQuestion.mutate(q.id)}
                      className="p-1.5 text-slate-400 hover:text-danger-600"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
