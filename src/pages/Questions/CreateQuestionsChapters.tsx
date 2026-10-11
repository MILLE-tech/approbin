import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import FolderGrid from '../../components/FolderGrid'
import { useSubject } from '../../hooks/useSubjects'
import { useCreateChapter, useDeleteChapter, useRenameChapter } from '../../hooks/useChapters'
import { useChaptersWithQuestionCounts, useToggleChapterReady, type ChapterWithQuestionCount } from '../../hooks/useQuestions'

export default function CreateQuestionsChapters() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { data: subject } = useSubject(subjectId)
  const { data: chapters, isLoading } = useChaptersWithQuestionCounts(subjectId)
  const createChapter = useCreateChapter(subjectId)
  const renameChapter = useRenameChapter(subjectId)
  const deleteChapter = useDeleteChapter(subjectId)
  const toggleReady = useToggleChapterReady(subjectId)

  return (
    <div>
      <PageHeader title={subject?.name ?? 'Matière'} subtitle="Choisissez un chapitre" back />
      <div className="p-5">
        <FolderGrid<ChapterWithQuestionCount>
          items={chapters ?? []}
          isLoading={isLoading}
          onOpen={(id) => navigate(`/questions/creer/${subjectId}/${id}`)}
          onCreate={(name) => createChapter.mutateAsync(name)}
          onRename={(id, name) => renameChapter.mutateAsync({ id, name })}
          onDelete={(id) => deleteChapter.mutateAsync(id)}
          emptyLabel="Aucun chapitre pour le moment."
          newLabel="Nouveau chapitre"
          cardClassName={(c) =>
            c.questions_ready ? 'bg-success-50 border-success-300 hover:border-success-400' : 'bg-white border-slate-200 hover:border-brand-300'
          }
          renderExtra={(c) => (
            <p className="text-xs text-slate-400 mt-0.5">
              {c.questionCount} question{c.questionCount > 1 ? 's' : ''}
            </p>
          )}
          renderAction={(c) => (
            <button
              onClick={() => toggleReady.mutate({ id: c.id, ready: !c.questions_ready })}
              className={`p-1.5 rounded-md hover:bg-slate-50 ${c.questions_ready ? 'text-success-600' : 'text-slate-400 hover:text-success-600'}`}
              aria-label={c.questions_ready ? 'Marquer comme non validé' : 'Valider ce chapitre'}
              title={c.questions_ready ? 'Chapitre validé' : 'Valider ce chapitre'}
            >
              <CheckCircle2 size={14} />
            </button>
          )}
        />
      </div>
    </div>
  )
}
