import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, Undo2 } from 'lucide-react'
import type { DrawingData, DrawingPoint, DrawingStroke } from '../types/database'

export function emptyDrawingData(): DrawingData {
  return { strokes: [] }
}

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 560

interface DrawingCanvasProps {
  data: DrawingData
  onChange?: (data: DrawingData) => void
  readOnly?: boolean
}

function strokeToPath(stroke: DrawingStroke): string {
  if (stroke.points.length === 0) return ''
  const [first, ...rest] = stroke.points
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
}

export default function DrawingCanvas({ data, onChange, readOnly = false }: DrawingCanvasProps) {
  const editable = !readOnly && !!onChange
  const svgRef = useRef<SVGSVGElement>(null)
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[] | null>(null)

  function toVirtualPoint(e: ReactPointerEvent<SVGSVGElement>): DrawingPoint {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    }
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!editable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setCurrentStroke([toVirtualPoint(e)])
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!editable || !currentStroke) return
    setCurrentStroke((prev) => (prev ? [...prev, toVirtualPoint(e)] : prev))
  }

  function commitStroke() {
    if (!editable || !onChange) {
      setCurrentStroke(null)
      return
    }
    setCurrentStroke((prev) => {
      if (prev && prev.length > 1) onChange({ strokes: [...data.strokes, { points: prev }] })
      return null
    })
  }

  function undo() {
    if (!onChange) return
    onChange({ strokes: data.strokes.slice(0, -1) })
  }

  function clear() {
    if (!onChange) return
    onChange({ strokes: [] })
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className={`w-full block bg-white ${editable ? 'touch-none cursor-crosshair' : ''}`}
        style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={commitStroke}
        onPointerLeave={commitStroke}
      >
        {data.strokes.map((stroke, i) => (
          <path
            key={i}
            d={strokeToPath(stroke)}
            fill="none"
            stroke="#1e293b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {currentStroke && (
          <path
            d={strokeToPath({ points: currentStroke })}
            fill="none"
            stroke="#1e293b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {data.strokes.length === 0 && !currentStroke && !editable && (
          <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2} textAnchor="middle" fill="#cbd5e1" fontSize={24}>
            (aucun dessin)
          </text>
        )}
      </svg>
      {editable && (
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={undo}
            disabled={data.strokes.length === 0}
            className="flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 px-3 py-2 flex-1 disabled:opacity-40 disabled:hover:text-brand-600"
          >
            <Undo2 size={14} />
            Annuler le trait
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
