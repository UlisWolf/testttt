import { useParams, useNavigate } from 'react-router-dom'
import { getRoutesByType, ROUTE_TYPE_CONFIGS } from '../data/routes'
import RouteCard from '../components/RouteCard'

export default function RouteList() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const config = ROUTE_TYPE_CONFIGS[type ?? '']
  const routes = getRoutesByType(type ?? '')

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-500">Mode introuvable.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-medium">
          ← Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`bg-gradient-to-br ${config.gradient} px-4 pt-12 pb-8`}>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 text-sm mb-6 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Accueil
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{config.emoji}</span>
          <h1 className="text-3xl font-black text-white">Mode {config.name}</h1>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{config.description}</p>

        <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
          <p className="text-white/70 text-xs uppercase tracking-wider font-medium">Score mesuré</p>
          <p className="text-white font-bold">{config.scoreLabel}</p>
        </div>
      </div>

      {/* Route list */}
      <div className="px-4 py-5 max-w-sm mx-auto">
        <p className="text-slate-500 text-sm mb-4">
          {routes.length} trajet{routes.length > 1 ? 's' : ''} disponible{routes.length > 1 ? 's' : ''}
        </p>
        <div className="flex flex-col gap-4">
          {routes.map(route => (
            <RouteCard key={route.id} route={route} config={config} />
          ))}
        </div>
      </div>
    </div>
  )
}
