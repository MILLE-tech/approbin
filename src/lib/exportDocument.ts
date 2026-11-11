import type { ExportChapterContent } from '../hooks/useExport'
import { formatAmount } from '../components/AccountingTable'
import { columnWidthsOf, rowLabelsOf } from '../components/GenericTable'
import { DEFAULT_COLOR } from '../components/DrawingCanvas'
import type { AccountingData, DrawingData, Question, TableData } from '../types/database'

export type ExportFormat = 'pdf' | 'word'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // Certains navigateurs ignorent un nom de téléchargement accentué et enregistrent "download".
  a.download = fileName.normalize('NFD').replace(/[̀-ͯ]/g, '')
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Libérer l'URL tout de suite peut faire perdre le nom du fichier à certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 100) || 'chapitre'
}

function byCreation<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

function typeLabel(q: Question): string {
  if (q.question_type === 'accounting') return 'Écriture comptable'
  if (q.question_type === 'table') return 'Tableau'
  if (q.question_type === 'drawing') return 'Schéma'
  return ''
}

const today = () => new Date().toLocaleDateString('fr-FR')

// ========== Modèle de tableau commun PDF / Word ==========

type Align = 'left' | 'right' | 'center'

interface TableModel {
  cols: { header: string; width: number; align?: Align }[]
  rows: { text: string; bold?: boolean; shaded?: boolean }[][]
}

function accountingModel(data: AccountingData): TableModel {
  return {
    cols: [
      { header: 'N° débit', width: 0.12 },
      { header: 'N° crédit', width: 0.12 },
      { header: 'Libellé', width: 0.34 },
      { header: 'Débit', width: 0.16, align: 'right' },
      { header: 'Crédit', width: 0.16, align: 'right' },
      { header: 'Solder', width: 0.1, align: 'center' },
    ],
    rows: data.rows.map((row) => {
      const libelle = row.kind === 'libelle'
      return [
        { text: libelle ? '' : row.compteDebit, shaded: libelle },
        { text: libelle ? '' : row.compteCredit, shaded: libelle },
        { text: row.libelle, bold: libelle, shaded: libelle },
        { text: formatAmount(row.montantDebit), bold: libelle, shaded: libelle },
        { text: formatAmount(row.montantCredit), bold: libelle, shaded: libelle },
        { text: !libelle && row.solder ? 'PS' : '', shaded: libelle },
      ]
    }),
  }
}

function genericModel(data: TableData): TableModel {
  const labels = rowLabelsOf(data)
  const hasLabels = labels.some((l) => l.trim())
  const widths = columnWidthsOf(data)
  const total = widths.reduce((a, b) => a + b, 0) || 1
  const dataShare = hasLabels ? 0.75 : 1
  return {
    cols: [
      ...(hasLabels ? [{ header: '', width: 0.25 }] : []),
      ...data.headers.map((header, i) => ({ header, width: (widths[i] / total) * dataShare })),
    ],
    rows: data.rows.map((row, r) => [
      ...(hasLabels ? [{ text: labels[r] ?? '', bold: true, shaded: true }] : []),
      ...row.map((cell) => ({ text: cell })),
    ]),
  }
}

// ========== PDF ==========

type RGB = [number, number, number]
const BRAND: RGB = [79, 70, 229]
const BRAND_LIGHT: RGB = [238, 242, 255]
const INK: RGB = [15, 23, 42]
const BODY: RGB = [51, 65, 85]
const MUTED: RGB = [100, 116, 139]
const BORDER: RGB = [203, 213, 225]
const SOFT: RGB = [241, 245, 249]
const DANGER: RGB = [220, 38, 38]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Les polices standard du PDF ne connaissent pas l'espace fine insécable utilisée par fr-FR. */
function pdfSafe(text: string): string {
  return text.replace(/[  ]/g, ' ')
}

async function buildPdf(chapter: ExportChapterContent): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 48
  const W = pageW - M * 2
  const BOTTOM = pageH - 56
  let y = M
  let onNewPage: (() => void) | null = null

  function setText(size: number, style: 'normal' | 'bold' | 'italic', color: RGB) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }

  function ensure(height: number) {
    if (y + height > BOTTOM && y > M + 1) {
      doc.addPage()
      y = M
      onNewPage?.()
    }
  }

  function paragraph(
    text: string,
    {
      size = 10.5,
      style = 'normal',
      color = BODY,
      lh,
      after = 0,
    }: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: RGB; lh?: number; after?: number } = {},
  ) {
    lh ??= size * 1.45
    setText(size, style, color)
    const lines = doc.splitTextToSize(pdfSafe(text), W) as string[]
    for (const line of lines) {
      ensure(lh)
      setText(size, style, color)
      doc.text(line, M, y + (lh - size) / 2, { baseline: 'top' })
      y += lh
    }
    y += after
  }

  function section(title: string) {
    ensure(48)
    y += 8
    setText(14, 'bold', INK)
    doc.text(title, M, y, { baseline: 'top' })
    y += 20
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.75)
    doc.line(M, y, M + W, y)
    y += 14
  }

  function answerBox(text: string) {
    const size = 10.5
    const lh = 15
    const pad = 6
    const padX = 12
    setText(size, 'normal', BODY)
    const lines = doc.splitTextToSize(pdfSafe(text.trim() || '—'), W - padX * 2) as string[]
    lines.forEach((line, i) => {
      const top = i === 0 ? pad : 0
      const bottom = i === lines.length - 1 ? pad : 0
      const h = lh + top + bottom
      ensure(h)
      doc.setFillColor(...SOFT)
      doc.rect(M, y, W, h, 'F')
      doc.setFillColor(...BRAND)
      doc.rect(M, y, 3, h, 'F')
      setText(size, 'normal', BODY)
      doc.text(line, M + padX, y + top + (lh - size) / 2, { baseline: 'top' })
      y += h
    })
  }

  function table(model: TableModel) {
    const size = 9
    const lh = 11.5
    const pad = 5
    const widths = model.cols.map((c) => c.width * W)
    const xs: number[] = []
    widths.forEach((_, i) => xs.push(i === 0 ? M : xs[i - 1] + widths[i - 1]))

    function drawRow(cells: { text: string; bold?: boolean; shaded?: boolean }[], header: boolean) {
      const lineSets = cells.map((c, i) => {
        setText(size, header || c.bold ? 'bold' : 'normal', INK)
        return doc.splitTextToSize(pdfSafe(c.text || ''), widths[i] - pad * 2) as string[]
      })
      const h = Math.max(1, ...lineSets.map((l) => l.length)) * lh + pad * 2
      ensure(h)
      cells.forEach((c, i) => {
        const fill = header ? BRAND_LIGHT : c.shaded ? SOFT : null
        if (fill) {
          doc.setFillColor(...fill)
          doc.rect(xs[i], y, widths[i], h, 'F')
        }
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.5)
        doc.rect(xs[i], y, widths[i], h, 'S')
        setText(size, header || c.bold ? 'bold' : 'normal', header ? BRAND : INK)
        const align = model.cols[i].align ?? 'left'
        const tx = align === 'right' ? xs[i] + widths[i] - pad : align === 'center' ? xs[i] + widths[i] / 2 : xs[i] + pad
        lineSets[i].forEach((line, li) => {
          doc.text(line, tx, y + pad + li * lh + (lh - size) / 2, { baseline: 'top', align })
        })
      })
      y += h
    }

    const headerCells = model.cols.map((c) => ({ text: c.header }))
    ensure(lh * 2 + pad * 4)
    drawRow(headerCells, true)
    onNewPage = () => drawRow(headerCells, true)
    model.rows.forEach((row) => drawRow(row, false))
    onNewPage = null
    y += 4
  }

  function drawing(data: DrawingData | null) {
    const scale = W / 1000
    const h = 560 * scale
    ensure(h + 8)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.75)
    doc.rect(M, y, W, h, 'S')
    doc.setLineCap('round')
    doc.setLineJoin('round')
    for (const stroke of data?.strokes ?? []) {
      const color = hexToRgb(stroke.color ?? DEFAULT_COLOR)
      if (stroke.kind === 'text') {
        const p = stroke.points[0]
        if (!p) continue
        setText(30 * scale, 'normal', color)
        doc.text(pdfSafe(stroke.text ?? ''), M + p.x * scale, y + p.y * scale, { baseline: 'middle' })
        continue
      }
      doc.setDrawColor(...color)
      doc.setLineWidth(3 * scale)
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1]
        const b = stroke.points[i]
        doc.line(M + a.x * scale, y + a.y * scale, M + b.x * scale, y + b.y * scale)
      }
    }
    doc.setLineCap('butt')
    y += h + 8
  }

  // En-tête
  setText(9, 'bold', BRAND)
  doc.text(pdfSafe(chapter.subjectName.toUpperCase()), M, y, { baseline: 'top' })
  y += 16
  paragraph(chapter.chapterName, { size: 22, style: 'bold', color: INK, lh: 28 })
  setText(9, 'normal', MUTED)
  doc.text(`Exporté le ${today()}`, M, y + 2, { baseline: 'top' })
  y += 18
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(2)
  doc.line(M, y, M + 40, y)
  y += 16

  const sheets = byCreation(chapter.sheets)
  if (sheets.length > 0) {
    section(`Fiches (${sheets.length})`)
    for (const sheet of sheets) {
      ensure(40)
      paragraph(sheet.title, { size: 12.5, style: 'bold', color: INK, after: 4 })
      if (sheet.content) paragraph(sheet.content, { after: 16 })
      else paragraph("Document importé — à consulter dans l'application.", { size: 9.5, style: 'italic', color: MUTED, after: 16 })
    }
  }

  const questions = byCreation(chapter.questions)
  if (questions.length > 0) {
    section(`Questions (${questions.length})`)
    questions.forEach((q, i) => {
      ensure(60)
      const kind = typeLabel(q)
      const label = `QUESTION ${i + 1}${kind ? `  ·  ${kind.toUpperCase()}` : ''}`
      setText(8.5, 'bold', BRAND)
      doc.text(label, M, y, { baseline: 'top' })
      if (q.flagged) {
        const w = doc.getTextWidth(label)
        setText(8.5, 'bold', DANGER)
        doc.text('  ·  SIGNALÉE', M + w, y, { baseline: 'top' })
      }
      y += 14
      paragraph(q.question, { size: 11.5, style: 'bold', color: INK, after: 6 })

      if (q.question_type === 'accounting' && q.accounting_data) table(accountingModel(q.accounting_data))
      else if (q.question_type === 'table' && q.table_data) table(genericModel(q.table_data))
      else if (q.question_type === 'drawing') drawing(q.drawing_data)
      else answerBox(q.answer)

      if (i < questions.length - 1) {
        y += 12
        ensure(16)
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.5)
        doc.setLineDashPattern([2, 3], 0)
        doc.line(M, y, M + W, y)
        doc.setLineDashPattern([], 0)
        y += 16
      }
    })
  }

  // Pied de page
  const total = doc.getNumberOfPages()
  const footerLabel = pdfSafe(`${chapter.subjectName} · ${chapter.chapterName}`)
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    setText(8, 'normal', MUTED)
    doc.text((doc.splitTextToSize(footerLabel, W * 0.75) as string[])[0], M, pageH - 32)
    doc.text(`${p} / ${total}`, pageW - M, pageH - 32, { align: 'right' })
  }

  return doc.output('blob')
}

// ========== Word ==========

async function drawingToPng(data: DrawingData | null): Promise<Uint8Array> {
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = 1000 * scale
  canvas.height = 560 * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1000, 560)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of data?.strokes ?? []) {
    const color = stroke.color ?? DEFAULT_COLOR
    if (stroke.kind === 'text') {
      const p = stroke.points[0]
      if (!p) continue
      ctx.fillStyle = color
      ctx.font = '30px sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText(stroke.text ?? '', p.x, p.y)
      continue
    }
    if (stroke.points.length < 2) continue
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image du schéma impossible à générer'))), 'image/png'),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

async function buildWord(chapter: ExportChapterContent): Promise<Blob> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    HeadingLevel,
    ImageRun,
    Packer,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx')

  // Largeur utile d'une page A4 avec les marges par défaut (2,54 cm), en twips.
  const TEXT_WIDTH = 9026
  const C = {
    brand: '4F46E5',
    brandLight: 'EEF2FF',
    ink: '0F172A',
    body: '334155',
    muted: '64748B',
    border: 'CBD5E1',
    soft: 'F1F5F9',
    danger: 'DC2626',
  }

  const run = (text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number; allCaps?: boolean } = {}) =>
    new TextRun({ text, bold: o.bold, italics: o.italics, allCaps: o.allCaps, color: o.color ?? C.body, size: o.size ?? 21 })

  const multiline = (text: string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
    text
      .split('\n')
      .map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, bold: o.bold, color: o.color ?? C.body, size: o.size ?? 21 }))

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: C.border }
  const alignOf = (a?: Align) => (a === 'right' ? AlignmentType.RIGHT : a === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT)

  function table(model: TableModel) {
    const widths = model.cols.map((c) => Math.round(c.width * TEXT_WIDTH))
    const cell = (text: string, i: number, o: { bold?: boolean; color?: string; fill?: string }) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: alignOf(model.cols[i].align),
            children: [run(text, { bold: o.bold, color: o.color ?? C.ink, size: 19 })],
          }),
        ],
      })
    return new Table({
      width: { size: TEXT_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      layout: TableLayoutType.FIXED,
      borders: {
        top: cellBorder,
        bottom: cellBorder,
        left: cellBorder,
        right: cellBorder,
        insideHorizontal: cellBorder,
        insideVertical: cellBorder,
      },
      rows: [
        new TableRow({
          tableHeader: true,
          children: model.cols.map((c, i) => cell(c.header, i, { bold: true, color: C.brand, fill: C.brandLight })),
        }),
        ...model.rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: row.map((c, i) => cell(c.text, i, { bold: c.bold, fill: c.shaded ? C.soft : undefined })),
            }),
        ),
      ],
    })
  }

  const section = (title: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 4 } },
      children: [run(title, { bold: true, color: C.ink, size: 28 })],
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({ spacing: { after: 40 }, children: [run(chapter.subjectName, { bold: true, color: C.brand, size: 18, allCaps: true })] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [run(chapter.chapterName, { bold: true, color: C.ink, size: 44 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.brand, space: 8 } },
      children: [run(`Exporté le ${today()}`, { color: C.muted, size: 18 })],
    }),
  ]

  const sheets = byCreation(chapter.sheets)
  if (sheets.length > 0) {
    children.push(section(`Fiches (${sheets.length})`))
    for (const sheet of sheets) {
      children.push(
        new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [run(sheet.title, { bold: true, color: C.ink, size: 25 })] }),
      )
      if (sheet.content) {
        for (const line of sheet.content.split('\n')) {
          children.push(new Paragraph({ spacing: { after: 80, line: 300 }, children: [run(line)] }))
        }
      } else {
        children.push(new Paragraph({ children: [run("Document importé — à consulter dans l'application.", { italics: true, color: C.muted, size: 19 })] }))
      }
    }
  }

  const questions = byCreation(chapter.questions)
  if (questions.length > 0) {
    children.push(section(`Questions (${questions.length})`))
    for (const [i, q] of questions.entries()) {
      const kind = typeLabel(q)
      children.push(
        new Paragraph({
          spacing: { before: 320, after: 60 },
          keepNext: true,
          children: [
            run(`Question ${i + 1}${kind ? `  ·  ${kind}` : ''}`, { bold: true, color: C.brand, size: 17, allCaps: true }),
            ...(q.flagged ? [run('  ·  Signalée', { bold: true, color: C.danger, size: 17, allCaps: true })] : []),
          ],
        }),
        new Paragraph({ spacing: { after: 120 }, keepNext: true, children: multiline(q.question, { bold: true, color: C.ink, size: 23 }) }),
      )

      if (q.question_type === 'accounting' && q.accounting_data) {
        children.push(table(accountingModel(q.accounting_data)), new Paragraph({ children: [] }))
      } else if (q.question_type === 'table' && q.table_data) {
        children.push(table(genericModel(q.table_data)), new Paragraph({ children: [] }))
      } else if (q.question_type === 'drawing') {
        children.push(
          new Paragraph({
            border: {
              top: cellBorder,
              bottom: cellBorder,
              left: cellBorder,
              right: cellBorder,
            },
            children: [
              new ImageRun({ type: 'png', data: await drawingToPng(q.drawing_data), transformation: { width: 600, height: 336 } }),
            ],
          }),
        )
      } else {
        children.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: C.soft, color: 'auto' },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: C.brand, space: 8 } },
            indent: { left: 160 },
            spacing: { after: 120, line: 300 },
            children: multiline(q.answer.trim() || '—'),
          }),
        )
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 21, color: C.body } } } },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [`${chapter.subjectName} · ${chapter.chapterName}    `, PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: C.muted,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
  return Packer.toBlob(doc)
}

// ========== Point d'entrée ==========

/** Un seul chapitre : télécharge directement le fichier. Plusieurs : un .zip contenant un dossier avec un fichier par chapitre. */
export async function exportChapters(chapters: ExportChapterContent[], format: ExportFormat) {
  const ext = format === 'pdf' ? 'pdf' : 'docx'
  const build = format === 'pdf' ? buildPdf : buildWord
  const fileNameOf = (c: ExportChapterContent) => safeFileName(`${c.subjectName} - ${c.chapterName}`)

  if (chapters.length === 1) {
    downloadBlob(await build(chapters[0]), `${fileNameOf(chapters[0])}.${ext}`)
    return
  }

  const { default: JSZip } = await import('jszip')
  const folderName = `Approbin-export-${new Date().toISOString().slice(0, 10)}`
  const zip = new JSZip()
  const folder = zip.folder(folderName)!
  const used = new Set<string>()
  for (const chapter of chapters) {
    const base = fileNameOf(chapter)
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})`
    used.add(name.toLowerCase())
    folder.file(`${name}.${ext}`, await build(chapter))
  }
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `${folderName}.zip`)
}
