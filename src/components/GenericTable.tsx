import { Plus, Trash2 } from 'lucide-react'
import type { TableData } from '../types/database'

export function emptyTableData(): TableData {
  return { headers: ['Entête 1'], rows: [['']] }
}

/** Mêmes entêtes qu'une TableData existante, mais toutes les cellules vides. */
export function blankCopyOf(data: TableData): TableData {
  return {
    headers: [...data.headers],
    rows: data.rows.map((row) => row.map(() => '')),
  }
}

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

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    if (!onChange) return
    const rows = data.rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row))
    onChange({ ...data, rows })
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
    })
  }

  function removeColumn(colIndex: number) {
    if (!onChange || data.headers.length <= 1) return
    onChange({
      ...data,
      headers: data.headers.filter((_, i) => i !== colIndex),
      rows: data.rows.map((row) => row.filter((_, i) => i !== colIndex)),
    })
  }

  function addRow() {
    if (!onChange) return
    onChange({ ...data, rows: [...data.rows, data.headers.map(() => '')] })
  }

  function removeRow(rowIndex: number) {
    if (!onChange) return
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== rowIndex) })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            {data.headers.map((header, c) => (
              <th key={c} className="px-2 py-1.5 text-left font-medium border-r border-slate-100 last:border-r-0">
                <div className="flex items-center gap-1">
                  {editableStructure ? (
                    <input
                      value={header}
                      onChange={(e) => updateHeader(c, e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-medium normal-case"
                    />
                  ) : (
                    <span>{header}</span>
                  )}
                  {editableStructure && data.headers.length > 1 && (
                    <button type="button" onClick={() => removeColumn(c)} className="text-slate-300 hover:text-danger-600">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </th>
            ))}
            {editableStructure && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, r) => (
            <tr key={r} className="border-t border-slate-100">
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
