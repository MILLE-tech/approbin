import type { ExportChapterContent } from '../hooks/useExport'
import { accountingTotals, formatTotal } from '../components/AccountingTable'
import type { AccountingData, TableData } from '../types/database'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function questionTypeLabel(type: string) {
  if (type === 'accounting') return ' (écriture comptable)'
  if (type === 'table') return ' (tableau)'
  return ''
}

// ========== PDF (jsPDF, génération texte paginée) ==========

export async function exportToPdf(chapters: ExportChapterContent[], fileName: string) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const maxWidth = pageWidth - margin * 2
  let y = margin

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  function writeLines(text: string, { size = 10, font = 'helvetica', style = 'normal', gap = 14 } = {}) {
    doc.setFont(font, style)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, maxWidth) as string[]
    for (const line of lines) {
      ensureSpace(gap)
      doc.text(line, margin, y)
      y += gap
    }
  }

  function writeAccountingTable(data: AccountingData) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    const header = ['Débit', 'Crédit', 'Libellé', 'Mt débit', 'Mt crédit']
      .map((h) => h.padEnd(14))
      .join('')
    writeLines(header, { size: 9, font: 'courier', style: 'bold', gap: 12 })
    for (const row of data.rows) {
      const line = [row.compteDebit, row.compteCredit, row.libelle, row.montantDebit, row.montantCredit]
        .map((v) => (v || '').toString().padEnd(14))
        .join('')
      writeLines(line, { size: 9, font: 'courier', gap: 12 })
    }
    const { totalDebit, totalCredit } = accountingTotals(data)
    const totalLine = ['', '', 'Total', formatTotal(totalDebit), formatTotal(totalCredit)]
      .map((v) => v.padEnd(14))
      .join('')
    writeLines(totalLine, { size: 9, font: 'courier', style: 'bold', gap: 12 })
  }

  function writeGenericTable(data: TableData) {
    const colWidth = 16
    writeLines(data.headers.map((h) => h.padEnd(colWidth)).join(''), { size: 9, font: 'courier', style: 'bold', gap: 12 })
    for (const row of data.rows) {
      writeLines(row.map((cell) => (cell || '').padEnd(colWidth)).join(''), { size: 9, font: 'courier', gap: 12 })
    }
  }

  writeLines(fileName, { size: 18, style: 'bold', gap: 24 })
  writeLines(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, { size: 9, gap: 20 })

  for (const chapter of chapters) {
    y += 8
    writeLines(`${chapter.subjectName} — ${chapter.chapterName}`, { size: 14, style: 'bold', gap: 20 })

    if (chapter.sheets.length > 0) {
      writeLines('Fiches', { size: 11, style: 'bold', gap: 16 })
      for (const sheet of chapter.sheets) {
        writeLines(sheet.title, { size: 10, style: 'bold', gap: 14 })
        if (sheet.content) {
          writeLines(sheet.content, { size: 10, gap: 13 })
        } else {
          writeLines('(document importé — disponible dans l\'application)', { size: 9, gap: 13 })
        }
        y += 6
      }
    }

    if (chapter.questions.length > 0) {
      writeLines('Questions', { size: 11, style: 'bold', gap: 16 })
      for (const q of chapter.questions) {
        writeLines(`Q : ${q.question}${questionTypeLabel(q.question_type)}`, { size: 10, style: 'bold', gap: 13 })
        if (q.question_type === 'accounting' && q.accounting_data) {
          writeAccountingTable(q.accounting_data)
        } else if (q.question_type === 'table' && q.table_data) {
          writeGenericTable(q.table_data)
        } else {
          writeLines(`R : ${q.answer}`, { size: 10, gap: 13 })
        }
        y += 6
      }
    }
  }

  doc.save(`${fileName}.pdf`)
}

// ========== Word (docx) ==========

export async function exportToWord(chapters: ExportChapterContent[], fileName: string) {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TextRun,
  } = await import('docx')

  function accountingTableToDocx(data: AccountingData) {
    const headerRow = new TableRow({
      children: ['N° débit', 'N° crédit', 'Libellé', 'Montant débit', 'Montant crédit'].map(
        (text) =>
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          }),
      ),
    })
    const rows = data.rows.map(
      (row) =>
        new TableRow({
          children: [row.compteDebit, row.compteCredit, row.libelle, row.montantDebit, row.montantCredit].map(
            (text) => new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph(text || '')] }),
          ),
        }),
    )
    const { totalDebit, totalCredit } = accountingTotals(data)
    const totalRow = new TableRow({
      children: ['', '', 'Total', formatTotal(totalDebit), formatTotal(totalCredit)].map(
        (text) =>
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          }),
      ),
    })
    return [new Table({ rows: [headerRow, ...rows, totalRow], width: { size: 100, type: WidthType.PERCENTAGE } })]
  }

  function genericTableToDocx(data: TableData) {
    const headerRow = new TableRow({
      children: data.headers.map(
        (text) =>
          new TableCell({
            width: { size: Math.floor(100 / data.headers.length), type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          }),
      ),
    })
    const rows = data.rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                width: { size: Math.floor(100 / data.headers.length), type: WidthType.PERCENTAGE },
                children: [new Paragraph(cell || '')],
              }),
          ),
        }),
    )
    return [new Table({ rows: [headerRow, ...rows], width: { size: 100, type: WidthType.PERCENTAGE } })]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({ text: fileName, heading: HeadingLevel.TITLE }),
    new Paragraph(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`),
  ]

  for (const chapter of chapters) {
    children.push(new Paragraph({ text: `${chapter.subjectName} — ${chapter.chapterName}`, heading: HeadingLevel.HEADING_1 }))

    if (chapter.sheets.length > 0) {
      children.push(new Paragraph({ text: 'Fiches', heading: HeadingLevel.HEADING_2 }))
      for (const sheet of chapter.sheets) {
        children.push(new Paragraph({ children: [new TextRun({ text: sheet.title, bold: true })] }))
        if (sheet.content) {
          for (const line of sheet.content.split('\n')) children.push(new Paragraph(line))
        } else {
          children.push(new Paragraph("(document importé — disponible dans l'application)"))
        }
      }
    }

    if (chapter.questions.length > 0) {
      children.push(new Paragraph({ text: 'Questions', heading: HeadingLevel.HEADING_2 }))
      for (const q of chapter.questions) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Q : ${q.question}${questionTypeLabel(q.question_type)}`, bold: true })],
          }),
        )
        if (q.question_type === 'accounting' && q.accounting_data) {
          children.push(...accountingTableToDocx(q.accounting_data))
        } else if (q.question_type === 'table' && q.table_data) {
          children.push(...genericTableToDocx(q.table_data))
        } else {
          children.push(new Paragraph(`R : ${q.answer}`))
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${fileName}.docx`)
}
