import type { ChangeEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { AccountingData, AccountingRow } from '../types/database'

export function emptyAccountingRow(): AccountingRow {
  return { compteDebit: '', compteCredit: '', libelle: '', montantDebit: '', montantCredit: '' }
}

export function emptyAccountingData(): AccountingData {
  return { rows: [emptyAccountingRow()] }
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

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Formatage "en direct" pendant la saisie : espace milliers sur la partie
 * entière, décimales telles que tapées (pas de .toFixed, sinon impossible
 * de taper "3000," sans qu'il redevienne "3000,00" à chaque frappe).
 */
export function formatAmountInput(raw: string): string {
  const match = raw.match(/^(\d*)([.,](\d*))?$/)
  if (!match) return raw
  const [, intPart, sep, decPart] = match
  const groupedInt = groupThousands(intPart)
  return sep === undefined ? groupedInt : `${groupedInt},${decPart ?? ''}`
}

// "Significatif" = chiffre OU séparateur décimal (., ,) : tout ce qui survit
// au filtrage brut. Compter aussi le séparateur est indispensable, sinon
// taper la virgule puis un chiffre insère ce chiffre AVANT elle (les deux
// finissent du même côté d'un simple compte de chiffres).
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

export function accountingTotals(data: AccountingData) {
  return {
    totalDebit: data.rows.reduce((sum, row) => sum + parseAmount(row.montantDebit), 0),
    totalCredit: data.rows.reduce((sum, row) => sum + parseAmount(row.montantCredit), 0),
  }
}

interface AccountingTableProps {
  data: AccountingData
  onChange?: (data: AccountingData) => void
  readOnly?: boolean
}

const cellClass = 'w-full text-sm px-2 py-1.5 focus:outline-none focus:bg-brand-50 bg-transparent'
const numberCellClass = `${cellClass} text-right font-mono`

/**
 * Champ montant avec espace milliers affiché en direct pendant la saisie.
 * La valeur stockée (onChange) reste le texte brut non formaté ; seul
 * l'affichage dans le champ change — avec un repositionnement manuel du
 * curseur (compté en nombre de chiffres avant lui) pour qu'il ne saute pas
 * quand un espace apparaît ou disparaît.
 */
function AmountInput({ value, onChange, className }: { value: string; onChange: (next: string) => void; className: string }) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const domValue = input.value
    const cursor = input.selectionStart ?? domValue.length
    const significantBeforeCursor = countSignificantBefore(domValue, cursor)
    const raw = domValue.replace(/[^0-9.,]/g, '')
    const formatted = formatAmountInput(raw)
    const newCursor = cursorAfterNthSignificant(formatted, significantBeforeCursor)
    // Pré-positionne la valeur/le curseur avant que React ne re-rende avec le
    // même résultat : rien à corriger côté React, donc pas de saut de curseur.
    input.value = formatted
    input.setSelectionRange(newCursor, newCursor)
    onChange(raw)
  }

  return <input value={formatAmountInput(value)} inputMode="decimal" onChange={handleChange} className={className} />
}

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

  const { totalDebit, totalCredit } = accountingTotals(data)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
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
                  <AmountInput
                    value={row.montantDebit}
                    onChange={(v) => updateRow(i, { montantDebit: v })}
                    className={numberCellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5 text-right font-mono">{formatAmount(row.montantDebit)}</span>
                )}
              </td>
              <td>
                {editable ? (
                  <AmountInput
                    value={row.montantCredit}
                    onChange={(v) => updateRow(i, { montantCredit: v })}
                    className={numberCellClass}
                  />
                ) : (
                  <span className="block px-2 py-1.5 text-right font-mono">{formatAmount(row.montantCredit)}</span>
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
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
            <td className="border-r border-slate-100" colSpan={3}>
              <span className="block px-2 py-1.5 text-xs uppercase text-slate-500">Total</span>
            </td>
            <td className="border-r border-slate-100">
              <span className="block px-2 py-1.5 text-right font-mono">{formatTotal(totalDebit)}</span>
            </td>
            <td>
              <span className="block px-2 py-1.5 text-right font-mono">{formatTotal(totalCredit)}</span>
            </td>
            {editable && <td />}
          </tr>
        </tfoot>
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
