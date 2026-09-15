import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, FileDown, Save } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useSheets, useUpdateSheetContent, getSheetFileUrl } from '../../hooks/useSheets'
import { exportElementToPdf } from '../../lib/exportPdf'

export default function SheetDetailPage() {
  const { subjectId, chapterId, sheetId } = useParams<{
    subjectId: string
    chapterId: string
    sheetId: string
  }>()
  const { data: sheets } = useSheets(chapterId)
  const sheet = sheets?.find((s) => s.id === sheetId)
  const updateSheet = useUpdateSheetContent(chapterId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(true)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (sheet) {
      setTitle(sheet.title)
      setContent(sheet.content ?? '')
    }
  }, [sheet?.id])

  useEffect(() => {
    if (sheet?.source_type === 'import' && sheet.file_path) {
      getSheetFileUrl(sheet.file_path).then(setFileUrl).catch(() => setFileUrl(null))
    }
  }, [sheet?.file_path])

  if (!subjectId || !chapterId) return null
  if (!sheet) return <p className="p-5 text-sm text-slate-400">Chargement…</p>

  async function handleSave() {
    if (!sheetId) return
    await updateSheet.mutateAsync({ id: sheetId, title, content })
    setSaved(true)
  }

  async function handleExport() {
    if (!printRef.current) return
    setExporting(true)
    try {
      await exportElementToPdf(printRef.current, title || 'fiche')
    } finally {
      setExporting(false)
    }
  }

  const isManual = sheet.source_type === 'manual'

  return (
    <div>
      <PageHeader
        title="Fiche de révision"
        back
        actions={
          isManual ? (
            <>
              {!saved && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-xs font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
                >
                  <Save size={14} />
                  Enregistrer
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <FileDown size={14} />
                {exporting ? 'Export…' : 'Exporter en PDF'}
              </button>
            </>
          ) : (
            fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} />
                Télécharger
              </a>
            )
          )
        }
      />

      <div className="p-5 max-w-3xl mx-auto">
        {isManual ? (
          <>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setSaved(false)
              }}
              className="w-full text-xl font-semibold text-slate-900 mb-4 focus:outline-none border-b border-transparent focus:border-slate-200 pb-1"
              placeholder="Titre de la fiche"
            />
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setSaved(false)
              }}
              onBlur={handleSave}
              rows={18}
              placeholder="Rédigez votre fiche ici (le format markdown est supporté)…"
              className="w-full text-sm text-slate-700 leading-relaxed focus:outline-none resize-y border border-slate-200 rounded-xl p-4"
            />

            {/* Rendu utilisé pour l'export PDF */}
            <div className="absolute -left-[9999px] top-0 w-[700px]" aria-hidden>
              <div ref={printRef} className="p-8 bg-white text-slate-900">
                <h1 className="text-2xl font-semibold mb-4">{title}</h1>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-600 mb-1">{sheet.file_name}</p>
            <p className="text-xs text-slate-400 mb-4">Document importé</p>
            {fileUrl && sheet.file_mime === 'application/pdf' && (
              <iframe src={fileUrl} title={sheet.title} className="w-full h-[70vh] rounded-lg border border-slate-100" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
