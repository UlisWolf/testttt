import { useNavigate } from 'react-router-dom'
import type { ScootRoute, RouteTypeConfig } from '../types'
import ScoreBar from './ScoreBar'

interface RouteCardProps {
  route: ScootRoute
  config: RouteTypeConfig
}

const difficultyColor: Record<string, string> = {
  Facile: 'bg-emerald-100 text-emerald-700',
  Moyen: 'bg-amber-100 text-amber-700',
  Expert: 'bg-red-100 text-red-700',
}

export default function RouteCard({ route, config }: RouteCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/routes/${route.type}/${route.id}`)}
      className="route-card w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-200"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: route.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-base leading-tight">{route.name}</h3>
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[route.difficulty]}`}>
            {route.difficulty}
          </span>
        </div>
        <p className="text-slate-500 text-sm mb-3 line-clamp-2 leading-relaxed">{route.description}</p>

        <div className="flex gap-3 text-sm mb-3">
          <div className="flex items-center gap-1 text-slate-600">
            <span>📍</span>
            <span className="font-medium">{route.distance} km</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>⏱️</span>
            <span className="font-medium">{route.duration} min</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>📍</span>
            <span className="font-medium">{route.pois.length} lieux</span>
          </div>
        </div>

        <ScoreBar score={route.score} label={config.scoreLabel} color={route.color} />

        <div className="flex flex-wrap gap-1.5 mt-3">
          {route.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
