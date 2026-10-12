import { useState, type ReactNode } from 'react'
import { Folder, Pencil, Plus, Trash2, Check, X } from 'lucide-react'
import { useConfirm } from '../contexts/ConfirmContext'

export interface FolderItem {
  id: string
  name: string
}

interface FolderGridProps<T extends FolderItem> {
  items: T[]
  onOpen: (id: string) => void
  onCreate: (name: string) => unknown
  onRename: (id: string, name: string) => unknown
  onDelete: (id: string) => unknown
  emptyLabel: string
  newLabel: string
  isLoading?: boolean
  /** Contenu additionnel affiché sous le nom (ex: nombre de questions). */
  renderExtra?: (item: T) => ReactNode
  /** Bouton additionnel affiché à côté de "Renommer"/"Supprimer". */
  renderAction?: (item: T) => ReactNode
  /** Classes additionnelles sur la carte (ex: fond vert si validée). */
  cardClassName?: (item: T) => string
}

export default function FolderGrid<T extends FolderItem>({
  items,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  emptyLabel,
  newLabel,
  isLoading,
  renderExtra,
  renderAction,
  cardClassName,
}: FolderGridProps<T>) {
  const confirm = useConfirm()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [newValue, setNewValue] = useState('')

  function startEdit(item: FolderItem) {
    setEditingId(item.id)
    setEditValue(item.name)
  }

  async function commitEdit() {
    if (editingId && editValue.trim()) {
      await onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  async function commitCreate() {
    if (newValue.trim()) {
      await onCreate(newValue.trim())
    }
    setNewValue('')
    setCreating(false)
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400 px-1">Chargement…</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.length === 0 && !creating && <p className="text-sm text-slate-400 col-span-full">{emptyLabel}</p>}

      {items.map((item) => (
        <div
          key={item.id}
          className={`group relative border rounded-xl p-4 pr-14 hover:shadow-sm transition cursor-pointer ${
            cardClassName ? cardClassName(item) : 'bg-white border-slate-200 hover:border-brand-300'
          }`}
          onClick={() => editingId !== item.id && onOpen(item.id)}
        >
          {editingId === item.id ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                className="min-w-0 flex-1 text-sm rounded-md border border-brand-300 px-2 py-1 focus:outline-none"
              />
              <button onClick={commitEdit} className="text-success-600 shrink-0">
                <Check size={16} />
              </button>
              <button onClick={() => setEditingId(null)} className="text-slate-400 shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Folder className="text-brand-500 mb-2" size={22} />
              <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
              {renderExtra && <div onClick={(e) => e.stopPropagation()}>{renderExtra(item)}</div>}
              <div className="absolute top-2.5 right-2.5 flex gap-0.5">
                {renderAction && <div onClick={(e) => e.stopPropagation()}>{renderAction(item)}</div>}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(item)
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-slate-50"
                  aria-label="Renommer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (await confirm(`Supprimer "${item.name}" ainsi que tout son contenu ?`)) onDelete(item.id)
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-danger-600 hover:bg-slate-50"
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {creating ? (
        <div className="bg-white border-2 border-dashed border-brand-300 rounded-xl p-4">
          <input
            autoFocus
            value={newValue}
            placeholder={newLabel}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitCreate()}
            onBlur={commitCreate}
            className="w-full text-sm focus:outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-400 hover:border-brand-300 hover:text-brand-600 transition min-h-[84px]"
        >
          <Plus size={20} />
          <span className="text-xs font-medium">{newLabel}</span>
        </button>
      )}
    </div>
  )
}
