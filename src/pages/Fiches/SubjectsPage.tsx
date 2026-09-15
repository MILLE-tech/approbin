import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import FolderGrid from '../../components/FolderGrid'
import { useCreateSubject, useDeleteSubject, useRenameSubject, useSubjects } from '../../hooks/useSubjects'

export default function SubjectsPage() {
  const navigate = useNavigate()
  const { data: subjects, isLoading } = useSubjects()
  const createSubject = useCreateSubject()
  const renameSubject = useRenameSubject()
  const deleteSubject = useDeleteSubject()

  return (
    <div>
      <PageHeader title="Fiches de révision" subtitle="Choisissez une matière" />
      <div className="p-5">
        <FolderGrid
          items={subjects ?? []}
          isLoading={isLoading}
          onOpen={(id) => navigate(`/fiches/${id}`)}
          onCreate={(name) => createSubject.mutateAsync(name)}
          onRename={(id, name) => renameSubject.mutateAsync({ id, name })}
          onDelete={(id) => deleteSubject.mutateAsync(id)}
          emptyLabel="Aucune matière pour le moment."
          newLabel="Nouvelle matière"
        />
      </div>
    </div>
  )
}
