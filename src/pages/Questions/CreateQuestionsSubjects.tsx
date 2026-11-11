import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import FolderGrid from '../../components/FolderGrid'
import { useCreateSubject, useDeleteSubject, useRenameSubject } from '../../hooks/useSubjects'
import { useSubjectsWithFlaggedCounts, type SubjectWithFlaggedCount } from '../../hooks/useQuestions'

export default function CreateQuestionsSubjects() {
  const navigate = useNavigate()
  const { data: subjects, isLoading } = useSubjectsWithFlaggedCounts()
  const createSubject = useCreateSubject()
  const renameSubject = useRenameSubject()
  const deleteSubject = useDeleteSubject()

  return (
    <div>
      <PageHeader title="Créer des questions" subtitle="Choisissez une matière" back />
      <div className="p-5">
        <FolderGrid<SubjectWithFlaggedCount>
          items={subjects ?? []}
          isLoading={isLoading}
          onOpen={(id) => navigate(`/questions/creer/${id}`)}
          onCreate={(name) => createSubject.mutateAsync(name)}
          onRename={(id, name) => renameSubject.mutateAsync({ id, name })}
          onDelete={(id) => deleteSubject.mutateAsync(id)}
          emptyLabel="Aucune matière pour le moment."
          newLabel="Nouvelle matière"
          renderExtra={(s) =>
            s.flaggedCount > 0 && (
              <p className="text-xs text-danger-500 font-medium mt-0.5">
                {s.flaggedCount} signalée{s.flaggedCount > 1 ? 's' : ''}
              </p>
            )
          }
        />
      </div>
    </div>
  )
}
