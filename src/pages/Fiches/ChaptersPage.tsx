import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import FolderGrid from '../../components/FolderGrid'
import { useSubject } from '../../hooks/useSubjects'
import { useChapters, useCreateChapter, useDeleteChapter, useRenameChapter } from '../../hooks/useChapters'

export default function ChaptersPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { data: subject } = useSubject(subjectId)
  const { data: chapters, isLoading } = useChapters(subjectId)
  const createChapter = useCreateChapter(subjectId)
  const renameChapter = useRenameChapter(subjectId)
  const deleteChapter = useDeleteChapter(subjectId)

  return (
    <div>
      <PageHeader title={subject?.name ?? 'Matière'} subtitle="Choisissez un chapitre" back />
      <div className="p-5">
        <FolderGrid
          items={chapters ?? []}
          isLoading={isLoading}
          onOpen={(id) => navigate(`/fiches/${subjectId}/${id}`)}
          onCreate={(name) => createChapter.mutateAsync(name)}
          onRename={(id, name) => renameChapter.mutateAsync({ id, name })}
          onDelete={(id) => deleteChapter.mutateAsync(id)}
          emptyLabel="Aucun chapitre pour le moment."
          newLabel="Nouveau chapitre"
        />
      </div>
    </div>
  )
}
