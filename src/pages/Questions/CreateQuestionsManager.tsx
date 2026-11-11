import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Plus, Repeat, Calculator, Table2, Type, PenTool } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AccountingTable, { emptyAccountingData, finalizeAccountingData } from '../../components/AccountingTable'
import GenericTable, { emptyTableData } from '../../components/GenericTable'
import DrawingCanvas, { emptyDrawingData } from '../../components/DrawingCanvas'
import QuestionRow from '../../components/QuestionRow'
import { useChapter } from '../../hooks/useChapters'
import {
  useCreateQuestion,
  useDeleteQuestion,
  useQuestions,
  useToggleQuestionActive,
  useToggleQuestionFlagged,
  useToggleQuestionReverse,
  useUpdateQuestion,
} from '../../hooks/useQuestions'
import type { AccountingData, DrawingData, QuestionType, TableData } from '../../types/database'

export default function CreateQuestionsManager() {
  const { chapterId } = useParams<{ subjectId: string; chapterId: string }>()
  const { data: chapter } = useChapter(chapterId)
  const { data: questions, isLoading } = useQuestions(chapterId)
  const createQuestion = useCreateQuestion(chapterId)
  const updateQuestion = useUpdateQuestion(chapterId)
  const deleteQuestion = useDeleteQuestion(chapterId)
  const toggleActive = useToggleQuestionActive(chapterId)
  const toggleReverse = useToggleQuestionReverse(chapterId)
  const toggleFlagged = useToggleQuestionFlagged(chapterId)

  const [newType, setNewType] = useState<QuestionType>('text')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newAccounting, setNewAccounting] = useState<AccountingData>(emptyAccountingData())
  const [newTable, setNewTable] = useState<TableData>(emptyTableData())
  const [newDrawing, setNewDrawing] = useState<DrawingData>(emptyDrawingData())
  const [newCanReverse, setNewCanReverse] = useState(false)

  async function handleAdd() {
    if (!newQuestion.trim()) return
    if (newType === 'text' && !newAnswer.trim()) return
    if (newType === 'table' && newTable.headers.every((h) => !h.trim())) return
    if (newType === 'drawing' && newDrawing.strokes.length === 0) return

    await createQuestion.mutateAsync({
      question: newQuestion.trim(),
      answer: newType === 'text' ? newAnswer.trim() : '',
      questionType: newType,
      accountingData: newType === 'accounting' ? finalizeAccountingData(newAccounting) : null,
      tableData: newType === 'table' ? newTable : null,
      drawingData: newType === 'drawing' ? newDrawing : null,
      canReverse: newType === 'text' && newCanReverse,
    })
    setNewQuestion('')
    setNewAnswer('')
    setNewAccounting(emptyAccountingData())
    setNewTable(emptyTableData())
    setNewDrawing(emptyDrawingData())
    setNewCanReverse(false)
  }

  return (
    <div>
      <PageHeader title={chapter?.name ?? 'Chapitre'} subtitle="Vos questions de quizz" back />
      <div className="p-5 max-w-2xl space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-slate-700">Nouvelle question</p>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              {(['text', 'accounting', 'table', 'drawing'] as QuestionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 ${
                    newType === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  } ${t !== 'text' ? 'border-l border-slate-200' : ''}`}
                >
                  {t === 'text' && <Type size={13} />}
                  {t === 'accounting' && <Calculator size={13} />}
                  {t === 'table' && <Table2 size={13} />}
                  {t === 'drawing' && <PenTool size={13} />}
                  {t === 'text' ? 'Texte' : t === 'accounting' ? 'Comptabilité' : t === 'table' ? 'Tableau' : 'Schéma'}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {newType === 'text' && (
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Réponse"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
          {newType === 'accounting' && <AccountingTable data={newAccounting} onChange={setNewAccounting} />}
          {newType === 'table' && <GenericTable data={newTable} onChange={setNewTable} />}
          {newType === 'drawing' && <DrawingCanvas data={newDrawing} onChange={setNewDrawing} />}

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
          <AnimatePresence>
            {questions?.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                onUpdate={(input) => updateQuestion.mutateAsync(input)}
                onToggleActive={(active) => toggleActive.mutate({ id: q.id, active })}
                onToggleReverse={(canReverse) => toggleReverse.mutate({ id: q.id, canReverse })}
                onToggleFlagged={(flagged) => toggleFlagged.mutate({ id: q.id, flagged })}
                onDelete={() => deleteQuestion.mutate(q.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
