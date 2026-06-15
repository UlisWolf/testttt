import { useParams, useNavigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { getRouteById, ROUTE_TYPE_CONFIGS } from '../data/routes'
import ScoreBar from '../components/ScoreBar'

const RouteMap = lazy(() => import('../components/RouteMap'))

const difficultyColor: Record<string, string> = {
  Facile: 'bg-emerald-100 text-emerald-700',
  Moyen: 'bg-amber-100 text-amber-700',
  Expert: 'bg-red-100 text-red-700',
}

export default function RouteDetail() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const route = getRouteById(id ?? '')
  const config = ROUTE_TYPE_CONFIGS[type ?? '']

  if (!route || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-500">Trajet introuvable.</p>
        <button onClick={() => navigate(-1)} className="text-indigo-600 font-medium">
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Map area */}
      <div className="relative" style={{ height: '50vh', minHeight: '280px', flexShrink: 0 }}>
        <Suspense fallback={
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <div className="text-slate-400 text-sm animate-pulse">Chargement de la carte…</div>
          </div>
        }>
          <RouteMap route={route} />
        </Suspense>

        {/* Floating back button */}
        <button
          onClick={() => navigate(`/routes/${type}`)}
          className="absolute top-4 left-4 z-[1000] bg-white rounded-full shadow-lg p-2.5 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Type badge */}
        <div className="absolute top-4 right-4 z-[1000]">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${config.badgeColor}`}>
            {config.emoji} {config.name}
          </span>
        </div>
      </div>

      {/* Info panel — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {/* Title & difficulty */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-800 leading-tight">{route.name}</h1>
            <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${difficultyColor[route.difficulty]}`}>
              {route.difficulty}
            </span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">{route.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Distance', value: `${route.distance} km`, icon: '📍' },
              { label: 'Durée', value: `${route.duration} min`, icon: '⏱️' },
              { label: 'Dénivelé', value: `+${route.elevationGain ?? 0}m`, icon: '⛰️' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
                <div className="text-lg mb-0.5">{stat.icon}</div>
                <div className="font-bold text-slate-800 text-sm">{stat.value}</div>
                <div className="text-slate-400 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Score */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
            <ScoreBar score={route.score} label={config.scoreLabel} color={route.color} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {route.tags.map(tag => (
              <span key={tag} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.badgeColor}`}>
                {tag}
              </span>
            ))}
          </div>

          {/* Points of interest */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Points d'intérêt · {route.pois.length}
            </h2>
            <div className="flex flex-col gap-2">
              {route.pois.map((poi, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <span className="text-2xl shrink-0">{poi.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{poi.name}</p>
                    {poi.description && (
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{poi.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg active:scale-95 transition-transform"
            style={{ background: `linear-gradient(135deg, ${route.color}, ${route.color}cc)` }}
          >
            🛴 Démarrer ce trajet
          </button>
          <p className="text-center text-xs text-slate-400 mt-2 mb-4">
            Ouvre la navigation dans ton app préférée
          </p>
        </div>
      </div>
    </div>
  )
}
