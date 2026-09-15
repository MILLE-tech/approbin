import { CheckCircle2, Clock, XCircle } from 'lucide-react'

interface StackedBarProps {
  reussi: number
  apprentissage: number
  echec: number
  total: number
  heightClass?: string
  showCounts?: boolean
}

const SEGMENT_CLASSES: Record<'reussi' | 'apprentissage' | 'echec', string> = {
  reussi: 'bg-success-500',
  apprentissage: 'bg-warning-500',
  echec: 'bg-danger-500',
}

export default function StackedBar({
  reussi,
  apprentissage,
  echec,
  total,
  heightClass = 'h-2.5',
  showCounts = true,
}: StackedBarProps) {
  return (
    <div>
      {total === 0 ? (
        <div className={`w-full ${heightClass} rounded-full bg-slate-100`} />
      ) : (
        <div className={`w-full ${heightClass} rounded-full bg-slate-100 flex overflow-hidden gap-[2px]`}>
          {reussi > 0 && (
            <div
              className={SEGMENT_CLASSES.reussi}
              style={{ width: `${(reussi / total) * 100}%` }}
              title={`Validé : ${reussi}`}
            />
          )}
          {apprentissage > 0 && (
            <div
              className={SEGMENT_CLASSES.apprentissage}
              style={{ width: `${(apprentissage / total) * 100}%` }}
              title={`En apprentissage : ${apprentissage}`}
            />
          )}
          {echec > 0 && (
            <div
              className={SEGMENT_CLASSES.echec}
              style={{ width: `${(echec / total) * 100}%` }}
              title={`Échoué : ${echec}`}
            />
          )}
        </div>
      )}
      {showCounts && total > 0 && (
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-success-600">
            <CheckCircle2 size={12} /> {reussi}
          </span>
          <span className="flex items-center gap-1 text-warning-600">
            <Clock size={12} /> {apprentissage}
          </span>
          <span className="flex items-center gap-1 text-danger-600">
            <XCircle size={12} /> {echec}
          </span>
        </div>
      )}
    </div>
  )
}

export function StatusLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-success-500" /> Validé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-warning-500" /> En apprentissage
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-danger-500" /> Échoué
      </span>
    </div>
  )
}
