import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, back, actions }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
