import { Suspense, lazy } from 'react'

const MapHome = lazy(() => import('./pages/MapHome'))

export default function App() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white text-sm">
        Chargement…
      </div>
    }>
      <MapHome />
    </Suspense>
  )
}
