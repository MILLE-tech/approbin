import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useChapter } from '../../hooks/useChapters'
import { useCreateQuestion, useDeleteQuestion, useQuestions, useUpdateQuestion } from '../../hooks/useQuestions'
import type { Question } from '../../types/database'

export default function CreateQuestionsManager() {
  const { chapterId } = useParams<{ subjectId: string; chapterId: string }>()
  const { data: chapter } = useChapter(chapterId)
  const { data: questions, isLoading } = useQuestions(chapterId)
  const createQuestion = useCreateQuestion(chapterId)
  const updateQuestion = useUpdateQuestion(chapterId)
  const deleteQuestion = useDeleteQuestion(chapterId)

  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    await createQuestion.mutateAsync({ question: newQuestion.trim(), answer: newAnswer.trim() })
    setNewQuestion('')
    setNewAnswer('')
  }

  function startEdit(q: Question) {
    setEditingId(q.id)
    setEditQuestion(q.question)
    setEditAnswer(q.answer)
  }

  async function commitEdit() {
    if (editingId && editQuestion.trim() && editAnswer.trim()) {
      await updateQuestion.mutateAsync({ id: editingId, question: editQuestion.trim(), answer: editAnswer.trim() })
    }
    setEditingId(null)
  }

  return (
    <div>
      <PageHeader title={chapter?.name ?? 'Chapitre'} subtitle="Vos questions de quizz" back />
      <div className="p-5 max-w-2xl space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Nouvelle question</p>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Réponse"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAdd}
            disabled={createQuestion.isPending}
            className="flex items-center gap-1.5 text-sm font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>

        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
        {!isLoading && questions?.length === 0 && (
          <p className="text-sm text-slate-400">Aucune question pour le moment.</p>
        )}

        <div className="space-y-3">
          {questions?.map((q) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4">
              {editingId === q.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
                  />
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-brand-300 rounded-lg p-2.5 focus:outline-none"
                  />
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
                    <p className="text-sm font-medium text-slate-800">{q.question}</p>
                    <p className="text-sm text-slate-500 mt-1">{q.answer}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(q)} className="p-1.5 text-slate-400 hover:text-brand-600">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => confirm('Supprimer cette question ?') && deleteQuestion.mutate(q.id)}
                      className="p-1.5 text-slate-400 hover:text-danger-600"
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
