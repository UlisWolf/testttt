import { useNavigate } from 'react-router-dom'
import type { RouteTypeConfig } from '../types'

interface RouteTypeCardProps {
  config: RouteTypeConfig
  routeCount: number
}

export default function RouteTypeCard({ config, routeCount }: RouteTypeCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/routes/${config.id}`)}
      className={`route-type-card w-full text-left rounded-2xl p-5 bg-gradient-to-br ${config.gradient} text-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{config.emoji}</span>
        <span className="text-xs font-medium bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
          {routeCount} trajets
        </span>
      </div>
      <h3 className="text-xl font-bold mb-1">{config.name}</h3>
      <p className="text-sm text-white/80 leading-relaxed">{config.description}</p>
      <div className="mt-4 flex items-center text-white/90 text-sm font-medium">
        <span>Découvrir</span>
        <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
