import { type ChangeEvent } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { AccountingData, AccountingRow } from '../types/database'

export function emptyAccountingRow(): AccountingRow {
  return { compteDebit: '', compteCredit: '', libelle: '', montantDebit: '', montantCredit: '' }
}

export function emptyLibelleRow(): AccountingRow {
  return { kind: 'libelle', compteDebit: '', compteCredit: '', libelle: '', montantDebit: '', montantCredit: '' }
}

export function emptyAccountingData(): AccountingData {
  return { rows: [emptyAccountingRow()] }
}

/** Mêmes lignes qu'une AccountingData existante, mais tous les montants vides (pour répondre à la question). */
export function blankCopyOf(data: AccountingData): AccountingData {
  return { rows: data.rows.map((row) => ({ ...row, montantDebit: '', montantCredit: '' })) }
}

export function parseAmount(value: string): number {
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function formatTotal(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Affichage d'un montant de ligne (espace entre milliers/millions), vide si non renseigné. */
export function formatAmount(value: string): string {
  if (!value.trim()) return ''
  return formatTotal(parseAmount(value))
}

function rawAmountString(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

/** Sous-total (débit/crédit) des lignes normales depuis la ligne « libellée » précédente, pour chaque ligne. Non significatif pour les lignes normales. */
export function computeLibelleTotals(data: AccountingData): { debit: number; credit: number }[] {
  const totals: { debit: number; credit: number }[] = []
  let debit = 0
  let credit = 0
  for (const row of data.rows) {
    if (row.kind === 'libelle') {
      totals.push({ debit, credit })
      debit = 0
      credit = 0
    } else {
      debit += parseAmount(row.montantDebit)
      credit += parseAmount(row.montantCredit)
      totals.push({ debit: 0, credit: 0 })
    }
  }
  return totals
}

/** À appeler à l'enregistrement : fige dans chaque ligne « libellée » le sous-total calculé depuis la précédente. */
export function finalizeAccountingData(data: AccountingData): AccountingData {
  const totals = computeLibelleTotals(data)
  return {
    rows: data.rows.map((row, i) =>
      row.kind === 'libelle'
        ? { ...row, montantDebit: rawAmountString(totals[i].debit), montantCredit: rawAmountString(totals[i].credit) }
        : row,
    ),
  }
}

interface AccountingTableProps {
  data: AccountingData
  onChange?: (data: AccountingData) => void
  readOnly?: boolean
  /** Verrouille les numéros de compte et libellés (mode "répondre") : seuls les montants restent modifiables. */
  lockStructure?: boolean
}

const cellClass = 'w-full text-sm px-2 py-1.5 focus:outline-none focus:bg-brand-50 bg-transparent'
const numberCellClass = `${cellClass} text-right font-mono`

function AmountInput({ value, onChange, className }: { value: string; onChange: (next: string) => void; className: string }) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const domValue = input.value
    const cursor = input.selectionStart ?? domValue.length
    const significantBeforeCursor = countSignificantBefore(domValue, cursor)
    const raw = domValue.replace(/[^0-9.,]/g, '')
    const formatted = formatAmountInput(raw)
    const newCursor = cursorAfterNthSignificant(formatted, significantBeforeCursor)
    input.value = formatted
    input.setSelectionRange(newCursor, newCursor)
    onChange(raw)
  }
  return <input value={formatAmountInput(value)} inputMode="decimal" onChange={handleChange} className={className} />
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatAmountInput(raw: string): string {
  const match = raw.match(/^(\d*)([.,](\d*))?$/)
  if (!match) return raw
  const [, intPart, sep, decPart] = match
  const groupedInt = groupThousands(intPart)
  return sep === undefined ? groupedInt : `${groupedInt},${decPart ?? ''}`
}

function countSignificantBefore(str: string, pos: number): number {
  let count = 0
  for (let i = 0; i < pos && i < str.length; i++) {
    if (/[\d.,]/.test(str[i])) count++
  }
  return count
}

function cursorAfterNthSignificant(str: string, n: number): number {
  if (n <= 0) return 0
  let count = 0
  for (let i = 0; i < str.length; i++) {
    if (/[\d.,]/.test(str[i])) {
      count++
      if (count === n) return i + 1
    }
  }
  return str.length
}

export default function AccountingTable({ data, onChange, readOnly = false, lockStructure = false }: AccountingTableProps) {
  const editableCells = !readOnly && !!onChange
  const editableStructure = editableCells && !lockStructure
  const libelleTotals = computeLibelleTotals(data)

  function updateRow(index: number, patch: Partial<AccountingRow>) {
    if (!onChange) return
    const rows = data.rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange({ ...data, rows })
  }

  function addRow() {
    if (!onChange) return
    onChange({ ...data, rows: [...data.rows, emptyAccountingRow()] })
  }

  function addLibelleRow() {
    if (!onChange) return
    onChange({ ...data, rows: [...data.rows, emptyLibelleRow()] })
  }

  function removeRow(index: number) {
    if (!onChange) return
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== index) })
  }

  function moveRow(from: number, to: number) {
    if (!onChange || to < 0 || to >= data.rows.length) return
    const rows = [...data.rows]
    const [moved] = rows.splice(from, 1)
    rows.splice(to, 0, moved)
    onChange({ ...data, rows })
  }

  function renderMontant(row: AccountingRow, index: number, field: 'montantDebit' | 'montantCredit') {
    if (row.kind === 'libelle') {
      if (!editableCells) return <span className="block px-2 py-1.5 text-right font-mono">{formatAmount(row[field])}</span>
      if (editableStructure) {
        const total = field === 'montantDebit' ? libelleTotals[index].debit : libelleTotals[index].credit
        return <span className="block px-2 py-1.5 text-right font-mono text-slate-500">{formatTotal(total)}</span>
      }
      return <AmountInput value={row[field]} onChange={(v) => updateRow(index, { [field]: v })} className={numberCellClass} />
    }
    if (editableCells) {
      return <AmountInput value={row[field]} onChange={(v) => updateRow(index, { [field]: v })} className={numberCellClass} />
    }
    return <span className="block px-2 py-1.5 text-right font-mono">{formatAmount(row[field])}</span>
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
            {editableStructure && <th className="w-7" />}
            <th className="px-2 py-1.5 text-left font-medium">N° compte débit</th>
            <th className="px-2 py-1.5 text-left font-medium">N° compte crédit</th>
            <th className="px-2 py-1.5 text-left font-medium">Libellé</th>
            <th className="px-2 py-1.5 text-right font-medium">Montant débit</th>
            <th className="px-2 py-1.5 text-right font-medium">Montant crédit</th>
            {editableStructure && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className={`border-t border-slate-100 ${row.kind === 'libelle' ? 'bg-slate-50/80' : ''}`}>
              {editableStructure && (
                <td className="pl-1">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveRow(i, i - 1)}
                      disabled={i === 0}
                      className="text-slate-300 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-300"
                      aria-label="Monter la ligne"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(i, i + 1)}
                      disabled={i === data.rows.length - 1}
                      className="text-slate-300 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-300"
                      aria-label="Descendre la ligne"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </td>
              )}
              {row.kind === 'libelle' ? (
                <td className="border-r border-slate-100" colSpan={3}>
                  {editableStructure ? (
                    <input
                      value={row.libelle}
                      onChange={(e) => updateRow(i, { libelle: e.target.value })}
                      placeholder="Nom de l'opération"
                      className={`${cellClass} font-medium`}
                    />
                  ) : (
                    <span className="block px-2 py-1.5 font-medium">{row.libelle}</span>
                  )}
                </td>
              ) : (
                <>
                  <td className="border-r border-slate-100">
                    {editableStructure ? (
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
                    {editableStructure ? (
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
                    {editableStructure ? (
                      <input value={row.libelle} onChange={(e) => updateRow(i, { libelle: e.target.value })} className={cellClass} />
                    ) : (
                      <span className="block px-2 py-1.5">{row.libelle}</span>
                    )}
                  </td>
                </>
              )}
              <td className="border-r border-slate-100">{renderMontant(row, i, 'montantDebit')}</td>
              <td>{renderMontant(row, i, 'montantCredit')}</td>
              {editableStructure && (
                <td>
                  <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-slate-300 hover:text-danger-600" aria-label="Supprimer la ligne">
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
            onClick={addLibelleRow}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 flex-1 border-l border-slate-100"
          >
            <Plus size={14} />
            Libellé
          </button>
        </div>
      )}
    </div>
  )
}
