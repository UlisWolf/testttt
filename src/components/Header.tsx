import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backLabel?: string
  backTo?: string
  gradient?: string
  children?: React.ReactNode
}

export default function Header({
  title = 'ScootWay',
  showBack = false,
  backLabel = 'Retour',
  backTo,
  gradient = 'from-slate-900 via-slate-800 to-slate-900',
  children,
}: HeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <header className={`bg-gradient-to-br ${gradient} px-4 py-4`}>
      {showBack && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/80 text-sm mb-4 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </button>
      )}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛴</span>
        <h1 className="text-2xl font-black text-white">{title}</h1>
      </div>
      {children}
    </header>
  )
}
