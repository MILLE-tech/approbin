import { Plus, Trash2 } from 'lucide-react'
import type { AccountingData, AccountingRow } from '../types/database'

export function emptyAccountingRow(): AccountingRow {
  return { compteDebit: '', compteCredit: '', libelle: '', montantDebit: '', montantCredit: '' }
}

export function emptyAccountingData(): AccountingData {
  return { date: '', rows: [emptyAccountingRow()] }
}

interface AccountingTableProps {
  data: AccountingData
  onChange?: (data: AccountingData) => void
  readOnly?: boolean
}

const cellClass = 'w-full text-sm px-2 py-1.5 focus:outline-none focus:bg-brand-50 bg-transparent'
const numberCellClass = `${cellClass} text-right font-mono`

export default function AccountingTable({ data, onChange, readOnly = false }: AccountingTableProps) {
  const editable = !readOnly && !!onChange

  function updateRow(index: number, patch: Partial<AccountingRow>) {
    if (!onChange) return
    const rows = data.rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange({ ...data, rows })
  }

  function addRow() {
    if (!onChange) return
    onChange({ ...data, rows: [...data.rows, emptyAccountingRow()] })
  }

  function removeRow(index: number) {
    if (!onChange) return
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Date</span>
        {editable ? (
          <input
            type="text"
            placeholder="xx/xx/xxxx"
            value={data.date}
            onChange={(e) => onChange!({ ...data, date: e.target.value })}
            className="text-sm px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        ) : (
          <span className="text-sm text-slate-700">{data.date || '—'}</span>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <th className="px-2 py-1.5 text-left font-medium">N° compte débit</th>
            <th className="px-2 py-1.5 text-left font-medium">N° compte crédit</th>
            <th className="px-2 py-1.5 text-left font-medium">Libellé</th>
            <th className="px-2 py-1.5 text-right font-medium">Montant débit</th>
            <th className="px-2 py-1.5 text-right font-medium">Montant crédit</th>
            {editable && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="border-r border-slate-100">
                {editable ? (
                  <input
                    value={row.compteDebit}
                    maxLength={5}
                    inputMode="numeric"
                    onChange={(e) => updateRow(i, { compteDebit: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    className={cellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5">{row.compteDebit}</span>
                )}
              </td>
              <td className="border-r border-slate-100">
                {editable ? (
                  <input
                    value={row.compteCredit}
                    maxLength={5}
                    inputMode="numeric"
                    onChange={(e) => updateRow(i, { compteCredit: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    className={cellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5">{row.compteCredit}</span>
                )}
              </td>
              <td className="border-r border-slate-100">
                {editable ? (
                  <input
                    value={row.libelle}
                    onChange={(e) => updateRow(i, { libelle: e.target.value })}
                    className={cellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5">{row.libelle}</span>
                )}
              </td>
              <td className="border-r border-slate-100">
                {editable ? (
                  <input
                    value={row.montantDebit}
                    inputMode="decimal"
                    onChange={(e) => updateRow(i, { montantDebit: e.target.value.replace(/[^0-9.,]/g, '') })}
                    className={numberCellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5 text-right font-mono">{row.montantDebit}</span>
                )}
              </td>
              <td>
                {editable ? (
                  <input
                    value={row.montantCredit}
                    inputMode="decimal"
                    onChange={(e) => updateRow(i, { montantCredit: e.target.value.replace(/[^0-9.,]/g, '') })}
                    className={numberCellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5 text-right font-mono">{row.montantCredit}</span>
                )}
              </td>
              {editable && (
                <td>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="p-1.5 text-slate-300 hover:text-danger-600"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 border-t border-slate-100 w-full"
        >
          <Plus size={14} />
          Ajouter une ligne
        </button>
      )}
    </div>
  )
}
