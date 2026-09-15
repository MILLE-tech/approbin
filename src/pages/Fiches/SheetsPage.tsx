import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, FilePlus, Upload, Trash2, Paperclip } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useChapter } from '../../hooks/useChapters'
import { useCreateManualSheet, useDeleteSheet, useImportSheet, useSheets } from '../../hooks/useSheets'

export default function SheetsPage() {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>()
  const navigate = useNavigate()
  const { data: chapter } = useChapter(chapterId)
  const { data: sheets, isLoading } = useSheets(chapterId)
  const createManual = useCreateManualSheet(chapterId)
  const importSheet = useImportSheet(chapterId)
  const deleteSheet = useDeleteSheet(chapterId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleCreateManual() {
    const sheet = await createManual.mutateAsync({ title: 'Nouvelle fiche', content: '' })
    navigate(`/fiches/${subjectId}/${chapterId}/${sheet.id}`)
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const title = file.name.replace(/\.[^.]+$/, '')
      await importSheet.mutateAsync({ title, file })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader title={chapter?.name ?? 'Chapitre'} subtitle="Vos fiches de révision" back />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={handleCreateManual}
            disabled={createManual.isPending}
            className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-500 hover:border-brand-300 hover:text-brand-600 transition"
          >
            <FilePlus size={20} />
            <span className="text-xs font-medium">Créer manuellement</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-500 hover:border-brand-300 hover:text-brand-600 transition"
          >
            <Upload size={20} />
            <span className="text-xs font-medium">{importing ? 'Import…' : 'Importer un document'}</span>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        </div>

        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
        {!isLoading && sheets?.length === 0 && (
          <p className="text-sm text-slate-400">Aucune fiche pour le moment.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sheets?.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => navigate(`/fiches/${subjectId}/${chapterId}/${sheet.id}`)}
              className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition cursor-pointer"
            >
              {sheet.source_type === 'import' ? (
                <Paperclip className="text-brand-500 mb-2" size={20} />
              ) : (
                <FileText className="text-brand-500 mb-2" size={20} />
              )}
              <p className="text-sm font-medium text-slate-800 truncate pr-6">{sheet.title}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {sheet.source_type === 'import' ? 'Document importé' : 'Fiche manuelle'} ·{' '}
                {new Date(sheet.created_at).toLocaleDateString('fr-FR')}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Supprimer la fiche "${sheet.title}" ?`)) deleteSheet.mutate(sheet)
                }}
                className="absolute top-2 right-2 hidden group-hover:block p-1 rounded bg-white text-slate-400 hover:text-danger-600"
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
