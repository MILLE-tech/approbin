import { useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { Download, FileText, FileType2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useExportOverview, useExportContent } from '../../hooks/useExport'
import { exportToPdf, exportToWord } from '../../lib/exportDocument'
import { useMotionPreferences } from '../../contexts/MotionPreferencesContext'
import { springs, reducedMotionTransition, revealVariants } from '../../lib/motionTokens'

type Format = 'pdf' | 'word'

export default function ExportPage() {
  const { data: overview, isLoading } = useExportOverview()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [includeSheets, setIncludeSheets] = useState(true)
  const [includeQuestions, setIncludeQuestions] = useState(true)
  const [format, setFormat] = useState<Format>('pdf')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { reducedMotion } = useMotionPreferences()
  const transition = reducedMotion ? reducedMotionTransition : springs.default
  const rVariants = revealVariants(reducedMotion)

  const allChapterIds = overview?.flatMap((s) => s.chapters.map((c) => c.id)) ?? []
  const chapterIds = selected.size === 0 ? allChapterIds : Array.from(selected)

  const { refetch } = useExportContent(chapterIds, includeSheets, includeQuestions, false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    setError(null)
    if (chapterIds.length === 0 || (!includeSheets && !includeQuestions)) return
    setExporting(true)
    try {
      const { data, error: fetchError } = await refetch()
      if (fetchError) throw fetchError
      const chapters = (data ?? []).filter((c) => c.sheets.length > 0 || c.questions.length > 0)
      if (chapters.length === 0) {
        setError('Aucun contenu à exporter pour cette sélection.')
        return
      }
      const fileName = `Approbin-export-${new Date().toISOString().slice(0, 10)}`
      if (format === 'pdf') {
        await exportToPdf(chapters, fileName)
      } else {
        await exportToWord(chapters, fileName)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export.")
    } finally {
      setExporting(false)
    }
  }

  const hasContent = overview && overview.some((s) => s.chapters.some((c) => c.sheetsCount > 0 || c.questionsCount > 0))

  return (
    <div>
      <PageHeader title="Export" subtitle="Gardez une trace de vos fiches et questions" />
      <div className="p-5 max-w-2xl space-y-5">
        {isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
        {!isLoading && !hasContent && <p className="text-sm text-slate-400">Rien à exporter pour le moment.</p>}

        {hasContent && (
          <>
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Contenu</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSheets}
                    onChange={(e) => setIncludeSheets(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Fiches
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQuestions}
                    onChange={(e) => setIncludeQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Questions
                </label>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Format</h3>
              <div className="flex gap-3">
                <m.button
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm transition-colors ${
                    format === 'pdf' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText size={16} />
                  PDF
                </m.button>
                <m.button
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  onClick={() => setFormat('word')}
                  className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm transition-colors ${
                    format === 'word' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileType2 size={16} />
                  Word
                </m.button>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Périmètre <span className="text-slate-400 font-normal">(rien de coché = tout exporter)</span>
              </h3>
              <div className="space-y-3">
                {overview?.map((subject) => (
                  <div key={subject.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{subject.name}</p>
                    <div className="space-y-1.5">
                      {subject.chapters.map((chapter) => (
                        <label key={chapter.id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(chapter.id)}
                            onChange={() => toggle(chapter.id)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          {chapter.name}
                          <span className="text-slate-400">
                            ({chapter.sheetsCount} fiche{chapter.sheetsCount > 1 ? 's' : ''}, {chapter.questionsCount}{' '}
                            question{chapter.questionsCount > 1 ? 's' : ''})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <AnimatePresence>
              {error && (
                <m.p
                  initial={rVariants.initial}
                  animate={rVariants.animate}
                  exit={rVariants.exit}
                  transition={transition}
                  className="text-sm text-danger-600"
                >
                  {error}
                </m.p>
              )}
            </AnimatePresence>

            <m.button
              whileTap={reducedMotion || exporting ? undefined : { scale: 0.97 }}
              onClick={handleExport}
              disabled={exporting || (!includeSheets && !includeQuestions)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 text-white font-medium px-5 py-2.5 text-sm hover:bg-brand-700 disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? 'Génération…' : 'Exporter'}
            </m.button>
          </>
        )}
      </div>
    </div>
  )
}
