import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, Eye, Minus, Pencil, Type, Undo2 } from 'lucide-react'
import type { DrawingData, DrawingPoint, DrawingStroke } from '../types/database'

export function emptyDrawingData(): DrawingData {
  return { strokes: [] }
}

export const DEFAULT_COLOR = '#1e293b'
/** Les éléments de cette couleur restent affichés quand la question est posée. */
export const GUIDE_COLOR = '#7c3aed'
const COLORS = [DEFAULT_COLOR, '#dc2626', '#2563eb', '#16a34a', '#ea580c']

/** Éléments en couleur « guide » d'un schéma, montrés en fond quand on répond à la question. */
export function guideOf(data: DrawingData | null): DrawingData {
  return { strokes: (data?.strokes ?? []).filter((s) => s.color === GUIDE_COLOR) }
}

type Tool = 'free' | 'line' | 'text'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 560
const TEXT_SIZE = 30

function strokeToPath(points: DrawingPoint[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
}

function StrokeShape({ stroke }: { stroke: DrawingStroke }) {
  const color = stroke.color ?? DEFAULT_COLOR
  if (stroke.kind === 'text') {
    const p = stroke.points[0]
    if (!p) return null
    return (
      <text x={p.x} y={p.y} fill={color} fontSize={TEXT_SIZE} dominantBaseline="middle" style={{ userSelect: 'none' }}>
        {stroke.text}
      </text>
    )
  }
  return (
    <path
      d={strokeToPath(stroke.points)}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

interface DrawingCanvasProps {
  data: DrawingData
  onChange?: (data: DrawingData) => void
  readOnly?: boolean
  /** Éléments affichés sous le dessin, non modifiables (ex: guide de la question). */
  background?: DrawingData
}

const TOOLS: { id: Tool; label: string; Icon: typeof Pencil }[] = [
  { id: 'free', label: 'Crayon', Icon: Pencil },
  { id: 'line', label: 'Trait droit', Icon: Minus },
  { id: 'text', label: 'Texte', Icon: Type },
]

export default function DrawingCanvas({ data, onChange, readOnly = false, background }: DrawingCanvasProps) {
  const editable = !readOnly && !!onChange
  const svgRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [tool, setTool] = useState<Tool>('free')
  const [color, setColor] = useState(DEFAULT_COLOR)
  // Refs en plus du state : les handlers lisent la valeur à jour sans dépendre du re-rendu.
  const draftRef = useRef<DrawingStroke | null>(null)
  const [draft, setDraftState] = useState<DrawingStroke | null>(null)
  const textDraftRef = useRef<{ point: DrawingPoint; value: string } | null>(null)
  const [textDraft, setTextDraftState] = useState<{ point: DrawingPoint; value: string } | null>(null)
  const colors = background ? COLORS : [...COLORS, GUIDE_COLOR]

  function setDraft(next: DrawingStroke | null) {
    draftRef.current = next
    setDraftState(next)
  }

  function setTextDraft(next: { point: DrawingPoint; value: string } | null) {
    textDraftRef.current = next
    setTextDraftState(next)
  }

  useEffect(() => {
    if (textDraft) requestAnimationFrame(() => inputRef.current?.focus())
    // Focus uniquement à l'ouverture d'une nouvelle zone de texte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textDraft?.point])

  function toVirtualPoint(e: ReactPointerEvent<SVGSVGElement>): DrawingPoint {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    }
  }

  function addStroke(stroke: DrawingStroke) {
    onChange?.({ strokes: [...data.strokes, stroke] })
  }

  function commitText() {
    const current = textDraftRef.current
    setTextDraft(null)
    if (current && current.value.trim()) {
      addStroke({ kind: 'text', color, text: current.value.trim(), points: [current.point] })
    }
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!editable) return
    const p = toVirtualPoint(e)
    if (tool === 'text') {
      e.preventDefault()
      if (textDraftRef.current) commitText()
      setTextDraft({ point: p, value: '' })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraft(tool === 'line' ? { kind: 'line', color, points: [p, p] } : { color, points: [p] })
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const prev = draftRef.current
    if (!prev) return
    const p = toVirtualPoint(e)
    setDraft(prev.kind === 'line' ? { ...prev, points: [prev.points[0], p] } : { ...prev, points: [...prev.points, p] })
  }

  function commitStroke() {
    const prev = draftRef.current
    setDraft(null)
    if (!prev || prev.points.length < 2) return
    const [a, b] = [prev.points[0], prev.points[prev.points.length - 1]]
    if (prev.kind === 'line' && Math.hypot(b.x - a.x, b.y - a.y) < 3) return
    addStroke(prev)
  }

  function undo() {
    onChange?.({ strokes: data.strokes.slice(0, -1) })
  }

  function clear() {
    onChange?.({ strokes: [] })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 border-b border-slate-100">
          {TOOLS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              title={label}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                tool === id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-pressed={color === c}
              title={c === GUIDE_COLOR ? 'Reste visible quand la question est posée' : undefined}
              aria-label={c === GUIDE_COLOR ? 'Couleur guide (visible dans la question)' : `Couleur ${c}`}
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                color === c ? 'border-slate-700 scale-110' : 'border-white'
              } shadow-sm transition`}
              style={{ backgroundColor: c }}
            >
              {c === GUIDE_COLOR && <Eye size={11} className="text-white" />}
            </button>
          ))}
          {color === GUIDE_COLOR && <span className="text-[11px] text-violet-600 ml-1">Visible dans la question</span>}
        </div>
      )}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className={`w-full block bg-white ${editable ? `touch-none ${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}` : ''}`}
          style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitStroke}
          onPointerLeave={commitStroke}
        >
          {background?.strokes.map((stroke, i) => <StrokeShape key={`bg-${i}`} stroke={stroke} />)}
          {data.strokes.map((stroke, i) => (
            <StrokeShape key={i} stroke={stroke} />
          ))}
          {draft && <StrokeShape stroke={draft} />}
          {data.strokes.length === 0 && !background?.strokes.length && !draft && !editable && (
            <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2} textAnchor="middle" fill="#cbd5e1" fontSize={24}>
              (aucun dessin)
            </text>
          )}
        </svg>
        {textDraft && (
          <input
            ref={inputRef}
            value={textDraft.value}
            onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText()
              if (e.key === 'Escape') setTextDraft(null)
            }}
            onBlur={commitText}
            placeholder="Texte…"
            className="absolute -translate-y-1/2 min-w-[7rem] bg-white/90 border border-brand-300 rounded px-1 py-0.5 text-sm outline-none"
            style={{
              left: `${(textDraft.point.x / VIEW_WIDTH) * 100}%`,
              top: `${(textDraft.point.y / VIEW_HEIGHT) * 100}%`,
              color,
            }}
          />
        )}
      </div>
      {editable && (
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={undo}
            disabled={data.strokes.length === 0}
            className="flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 flex-1 disabled:opacity-40 disabled:hover:text-brand-600"
          >
            <Undo2 size={14} />
            Annuler
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={data.strokes.length === 0}
            className="flex items-center justify-center gap-1.5 text-xs text-danger-600 hover:text-danger-700 px-3 py-2 flex-1 border-l border-slate-100 disabled:opacity-40 disabled:hover:text-danger-600"
          >
            <Eraser size={14} />
            Tout effacer
          </button>
        </div>
      )}
    </div>
  )
}
