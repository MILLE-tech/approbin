import { useState } from 'react'
import { m } from 'motion/react'
import { Pencil, Trash2, Check, X, Repeat, Power, Calculator, Table2, Type } from 'lucide-react'
import AccountingTable, { emptyAccountingData } from './AccountingTable'
import GenericTable, { emptyTableData } from './GenericTable'
import { useConfirm } from '../contexts/ConfirmContext'
import { useMotionPreferences } from '../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition, listItemVariants } from '../lib/motionTokens'
import type { AccountingData, Question, QuestionType, TableData } from '../types/database'

export interface QuestionRowProps {
  question: Question
  subjectName?: string
  chapterName?: string
  onUpdate: (input: {
    id: string
    question: string
    answer: string
    questionType: QuestionType
    accountingData: AccountingData | null
    tableData: TableData | null
    canReverse: boolean
  }) => Promise<unknown>
  onToggleActive: (active: boolean) => void
  onToggleReverse: (canReverse: boolean) => void
  onDelete: () => void
}

export default function QuestionRow({
  question: q,
  subjectName,
  chapterName,
  onUpdate,
  onToggleActive,
  onToggleReverse,
  onDelete,
}: QuestionRowProps) {
  const confirm = useConfirm()
  const { reducedMotion } = useMotionPreferences()
  const transition = reducedMotion ? reducedMotionTransition : springs.snappy
  const iVariants = listItemVariants(reducedMotion)
  const [editing, setEditing] = useState(false)
  const [editType, setEditType] = useState<QuestionType>('text')
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editAccounting, setEditAccounting] = useState<AccountingData>(emptyAccountingData())
  const [editTable, setEditTable] = useState<TableData>(emptyTableData())

  function startEdit() {
    setEditType(q.question_type)
    setEditQuestion(q.question)
    setEditAnswer(q.answer)
    setEditAccounting(q.accounting_data ?? emptyAccountingData())
    setEditTable(q.table_data ?? emptyTableData())
    setEditing(true)
  }

  async function commitEdit() {
    if (!editQuestion.trim()) return
    if (editType === 'text' && !editAnswer.trim()) return
    await onUpdate({
      id: q.id,
      question: editQuestion.trim(),
      answer: editType === 'text' ? editAnswer.trim() : '',
      questionType: editType,
      accountingData: editType === 'accounting' ? editAccounting : null,
      tableData: editType === 'table' ? editTable : null,
      canReverse: q.can_reverse,
    })
    setEditing(false)
  }

  const typeBadge =
    q.question_type === 'accounting' ? (
      <p className="flex items-center gap-1 text-[11px] font-medium text-brand-600 mb-1">
        <Calculator size={12} />
        Écriture comptable
      </p>
    ) : q.question_type === 'table' ? (
      <p className="flex items-center gap-1 text-[11px] font-medium text-brand-600 mb-1">
        <Table2 size={12} />
        Tableau
      </p>
    ) : null

  return (
    <m.div
      initial={iVariants.initial}
      animate={iVariants.animate}
      exit={iVariants.exit}
      transition={transition}
      className={`border rounded-xl p-4 ${q.active ? 'bg-white border-slate-200' : 'bg-warning-50 border-warning-200'}`}
    >
      {editing ? (
        <div className="space-y-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
            {(['text', 'accounting', 'table'] as QuestionType[]).map((t) => (
              <m.button
                key={t}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                onClick={() => setEditType(t)}
                className={`flex items-center gap-1 px-2.5 py-1.5 ${
                  editType === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                } ${t !== 'text' ? 'border-l border-slate-200' : ''}`}
              >
                {t === 'text' && <Type size={13} />}
                {t === 'accounting' && <Calculator size={13} />}
                {t === 'table' && <Table2 size={13} />}
                {t === 'text' ? 'Texte' : t === 'accounting' ? 'Comptabilité' : 'Tableau'}
              </m.button>
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
            <m.button whileTap={reducedMotion ? undefined : { scale: 0.9 }} onClick={commitEdit} className="text-success-600">
              <Check size={18} />
            </m.button>
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.9 }}
              onClick={() => setEditing(false)}
              className="text-slate-400"
            >
              <X size={18} />
            </m.button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {(subjectName || chapterName) && (
              <p className="text-[11px] text-slate-400 mb-1">
                {subjectName} {chapterName && `· ${chapterName}`}
              </p>
            )}
            {!q.active && <p className="text-[11px] font-medium text-warning-700 uppercase mb-1">Désactivée</p>}
            {typeBadge}
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
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.88 }}
              onClick={startEdit}
              className="p-1.5 text-slate-400 hover:text-brand-600"
              title="Modifier"
            >
              <Pencil size={15} />
            </m.button>
            {q.question_type === 'text' && (
              <m.button
                whileTap={reducedMotion ? undefined : { scale: 0.88 }}
                onClick={() => onToggleReverse(!q.can_reverse)}
                className={`p-1.5 ${q.can_reverse ? 'text-brand-600' : 'text-slate-400 hover:text-brand-600'}`}
                title="Inverser question/réponse 1 fois sur 4"
              >
                <Repeat size={15} />
              </m.button>
            )}
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.88 }}
              onClick={() => onToggleActive(!q.active)}
              className={`p-1.5 ${q.active ? 'text-slate-400 hover:text-warning-600' : 'text-warning-600'}`}
              title={q.active ? 'Désactiver' : 'Activer'}
            >
              <Power size={15} />
            </m.button>
            <m.button
              whileTap={reducedMotion ? undefined : { scale: 0.88 }}
              onClick={async () => (await confirm('Supprimer cette question ?')) && onDelete()}
              className="p-1.5 text-slate-400 hover:text-danger-600"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </m.button>
          </div>
        </div>
      )}
    </m.div>
  )
}
