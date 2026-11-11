import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { TableData } from '../types/database'

export function emptyTableData(): TableData {
  return { headers: ['Entête 1'], rowLabels: [''], rows: [['']] }
}

/** Libellés de ligne avec repli pour les données existantes enregistrées avant l'ajout de ce champ. */
export function rowLabelsOf(data: TableData): string[] {
  return data.rowLabels ?? data.rows.map(() => '')
}

/** Mêmes entêtes et libellés de ligne qu'une TableData existante, mais toutes les cellules vides. */
export function blankCopyOf(data: TableData): TableData {
  return {
    headers: [...data.headers],
    rowLabels: [...rowLabelsOf(data)],
    rows: data.rows.map((row) => row.map(() => '')),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
  }
}

/** Largeur (%) de chaque colonne, avec repli sur une répartition égale. */
export function columnWidthsOf(data: TableData): number[] {
  if (data.columnWidths && data.columnWidths.length === data.headers.length) return data.columnWidths
  return data.headers.map(() => 100 / data.headers.length)
}

const MIN_COLUMN_WIDTH_PX = 32

interface GenericTableProps {
  data: TableData
  onChange?: (data: TableData) => void
  readOnly?: boolean
  /** Verrouille le titre, les entêtes et le nombre de lignes/colonnes (mode "répondre"). */
  lockStructure?: boolean
}

const cellClass = 'w-full text-sm px-2 py-1.5 focus:outline-none focus:bg-brand-50 bg-transparent'

export default function GenericTable({ data, onChange, readOnly = false, lockStructure = false }: GenericTableProps) {
  const editableCells = !readOnly && !!onChange
  const editableStructure = editableCells && !lockStructure
  const rowLabels = rowLabelsOf(data)
  const columnWidths = columnWidthsOf(data)
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([])

  function startResize(e: ReactPointerEvent<HTMLDivElement>, colIndex: number) {
    if (!onChange) return
    e.preventDefault()
    const thA = thRefs.current[colIndex]
    const thB = thRefs.current[colIndex + 1]
    if (!thA || !thB) return
    const startWidthPxA = thA.getBoundingClientRect().width
    const startWidthPxB = thB.getBoundingClientRect().width
    const totalPx = startWidthPxA + startWidthPxB
    const totalPercent = columnWidths[colIndex] + columnWidths[colIndex + 1]
    const startX = e.clientX

    function onMove(ev: PointerEvent) {
      const deltaX = ev.clientX - startX
      const newWidthPxA = Math.min(Math.max(startWidthPxA + deltaX, MIN_COLUMN_WIDTH_PX), totalPx - MIN_COLUMN_WIDTH_PX)
      const ratio = newWidthPxA / totalPx
      const newWidths = [...columnWidths]
      newWidths[colIndex] = totalPercent * ratio
      newWidths[colIndex + 1] = totalPercent * (1 - ratio)
      onChange!({ ...data, columnWidths: newWidths })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    if (!onChange) return
    const rows = data.rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row))
    onChange({ ...data, rows })
  }

  function updateRowLabel(rowIndex: number, value: string) {
    if (!onChange) return
    const labels = rowLabels.map((label, i) => (i === rowIndex ? value : label))
    onChange({ ...data, rowLabels: labels })
  }

  function updateHeader(colIndex: number, value: string) {
    if (!onChange) return
    const headers = data.headers.map((h, i) => (i === colIndex ? value : h))
    onChange({ ...data, headers })
  }

  function addColumn() {
    if (!onChange) return
    onChange({
      ...data,
      headers: [...data.headers, `Entête ${data.headers.length + 1}`],
      rows: data.rows.map((row) => [...row, '']),
      columnWidths: undefined,
    })
  }

  function removeColumn(colIndex: number) {
    if (!onChange || data.headers.length <= 1) return
    onChange({
      ...data,
      headers: data.headers.filter((_, i) => i !== colIndex),
      rows: data.rows.map((row) => row.filter((_, i) => i !== colIndex)),
      columnWidths: undefined,
    })
  }

  function addRow() {
    if (!onChange) return
    onChange({ ...data, rowLabels: [...rowLabels, ''], rows: [...data.rows, data.headers.map(() => '')] })
  }

  function removeRow(rowIndex: number) {
    if (!onChange) return
    onChange({
      ...data,
      rowLabels: rowLabels.filter((_, i) => i !== rowIndex),
      rows: data.rows.filter((_, i) => i !== rowIndex),
    })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '110px' }} />
          {data.headers.map((_, c) => (
            <col key={c} style={{ width: `${columnWidths[c]}%` }} />
          ))}
          {editableStructure && <col style={{ width: '32px' }} />}
        </colgroup>
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <th className="px-2 py-1.5 text-left font-medium border-r border-slate-100 w-px" />
            {data.headers.map((header, c) => (
              <th
                key={c}
                ref={(el) => {
                  thRefs.current[c] = el
                }}
                className="relative px-2 py-1.5 text-left font-medium border-r border-slate-100 last:border-r-0"
              >
                <div className="flex items-center gap-1">
                  {editableStructure ? (
                    <input
                      value={header}
                      onChange={(e) => updateHeader(c, e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-medium normal-case"
                    />
                  ) : (
                    <span className="truncate">{header}</span>
                  )}
                  {editableStructure && data.headers.length > 1 && (
                    <button type="button" onClick={() => removeColumn(c)} className="text-slate-300 hover:text-danger-600 shrink-0">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                {editableCells && c < data.headers.length - 1 && (
                  <div
                    onPointerDown={(e) => startResize(e, c)}
                    className="absolute top-0 right-[-5px] w-2.5 h-full cursor-col-resize touch-none z-10 hover:bg-brand-300/60"
                    aria-hidden="true"
                  />
                )}
              </th>
            ))}
            {editableStructure && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, r) => (
            <tr key={r} className="border-t border-slate-100">
              <td className="border-r border-slate-100 bg-slate-50/60 whitespace-nowrap">
                {editableStructure ? (
                  <input
                    value={rowLabels[r] ?? ''}
                    onChange={(e) => updateRowLabel(r, e.target.value)}
                    className={`${cellClass} font-medium`}
                  />
                ) : (
                  <span className="block px-2 py-1.5 font-medium">{rowLabels[r]}</span>
                )}
              </td>
              {row.map((cell, c) => (
                <td key={c} className="border-r border-slate-100 last:border-r-0">
                  {editableCells ? (
                    <input value={cell} onChange={(e) => updateCell(r, c, e.target.value)} className={cellClass} />
                  ) : (
                    <span className="block px-2 py-1.5">{cell}</span>
                  )}
                </td>
              ))}
              {editableStructure && (
                <td>
                  <button type="button" onClick={() => removeRow(r)} className="p-1.5 text-slate-300 hover:text-danger-600">
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editableStructure && (
        <div className="flex border-t border-slate-100">
          <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 flex-1">
            <Plus size={14} />
            Ajouter une ligne
          </button>
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 flex-1 border-l border-slate-100"
          >
            <Plus size={14} />
            Ajouter une colonne
          </button>
        </div>
      )}
    </div>
  )
}
