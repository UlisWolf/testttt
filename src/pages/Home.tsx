import { ROUTE_TYPE_CONFIGS } from '../data/routes'
import { ALL_ROUTES } from '../data/routes'
import RouteTypeCard from '../components/RouteTypeCard'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent" />
        <div className="relative px-5 pt-14 pb-10 text-center">
          <div className="text-6xl mb-4 animate-bounce">🛴</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Scoot<span className="text-indigo-400">Way</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-xs mx-auto">
            Trouve ton trajet idéal en trottinette électrique à Paris
          </p>

          {/* Stats bar */}
          <div className="mt-6 flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{ALL_ROUTES.length}</p>
              <p className="text-xs text-slate-400">Trajets</p>
            </div>
            <div className="w-px bg-slate-600" />
            <div>
              <p className="text-2xl font-bold text-white">Paris</p>
              <p className="text-xs text-slate-400">Ville</p>
            </div>
            <div className="w-px bg-slate-600" />
            <div>
              <p className="text-2xl font-bold text-white">4</p>
              <p className="text-xs text-slate-400">Modes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Route type cards */}
      <div className="px-4 pb-10">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
          Choisir un mode
        </h2>
        <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
          {Object.values(ROUTE_TYPE_CONFIGS).map(config => (
            <RouteTypeCard
              key={config.id}
              config={config}
              routeCount={ALL_ROUTES.filter(r => r.type === config.id).length}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-slate-600 text-xs">
        🛴 ScootWay — Paris, 2024
      </div>
    </div>
  )
}
