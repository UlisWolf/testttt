import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import SearchBar from '../components/SearchBar'
import Speedometer from '../components/Speedometer'
import TurnInstruction from '../components/TurnInstruction'
import { useGeolocation } from '../hooks/useGeolocation'
import { computeRoute, formatDistance, formatDuration, formatETA, haversine } from '../services/routing'
import type { ComputedRoute, RouteMode } from '../services/routing'
import type { GeoResult } from '../services/geocoding'

// ── Tile layers per mode ─────────────────────────────────────────────────────
const TILES: Record<RouteMode, { url: string; attribution: string }> = {
  nuit: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
  securite: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
  },
  chill: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap France',
  },
  panoramique: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
  },
}

const MODE_COLORS: Record<RouteMode, string> = {
  nuit: '#818cf8', securite: '#f97316', chill: '#34d399', panoramique: '#f59e0b',
}

const MODE_CONFIG = {
  nuit:        { emoji: '🌙', name: 'Nuit',        desc: 'Rues éclairées',   bg: 'bg-indigo-600' },
  securite:    { emoji: '🛡️', name: 'Sécurité',    desc: 'Zones animées',    bg: 'bg-orange-500' },
  chill:       { emoji: '🌿', name: 'Chill',        desc: 'Voies vertes',     bg: 'bg-emerald-500' },
  panoramique: { emoji: '🏛️', name: 'Panoramique', desc: 'Monuments',        bg: 'bg-amber-500' },
}

// ── Map sub-components ───────────────────────────────────────────────────────
const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(79,70,229,0.3)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: '',
})
const destIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], className: '',
})

function RecenterMap({ pos, follow }: { pos: [number, number] | null; follow: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (pos && follow) map.setView(pos, Math.max(map.getZoom(), 16))
  }, [pos, follow, map])
  return null
}

function FitRoute({ geometry }: { geometry: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (geometry.length > 1) {
      map.fitBounds(L.latLngBounds(geometry), { padding: [60, 60] })
    }
  }, [geometry, map])
  return null
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MapHome() {
  const [mode, setMode] = useState<RouteMode>('chill')
  const [destination, setDestination] = useState<GeoResult | null>(null)
  const [route, setRoute] = useState<ComputedRoute | null>(null)
  const [computing, setComputing] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [distToNext, setDistToNext] = useState(0)
  const [showModePanel, setShowModePanel] = useState(false)
  const [arrived, setArrived] = useState(false)

  const geo = useGeolocation(true)
  const followRef = useRef(true)
  const [follow, setFollow] = useState(true)

  // ── Compute route when destination changes ──────────────────────────────
  useEffect(() => {
    if (!destination || !geo.position) return
    setRouteError(null)
    setComputing(true)
    setRoute(null)
    setNavigating(false)
    setStepIndex(0)
    setArrived(false)
    computeRoute(geo.position, [destination.lat, destination.lng])
      .then(setRoute)
      .catch(e => setRouteError(e.message))
      .finally(() => setComputing(false))
  }, [destination])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!navigating || !route || !geo.position) return
    const steps = route.steps
    if (stepIndex >= steps.length) return

    // Find closest point on geometry to current position
    let minDist = Infinity
    let closestIdx = 0
    for (let i = 0; i < route.geometry.length; i++) {
      const d = haversine(geo.position, route.geometry[i])
      if (d < minDist) { minDist = d; closestIdx = i }
    }

    // Compute cumulative distances along geometry
    const cumDistances: number[] = [0]
    for (let i = 1; i < route.geometry.length; i++) {
      cumDistances.push(cumDistances[i - 1] + haversine(route.geometry[i - 1], route.geometry[i]))
    }

    // Find which step we're on based on cumulative step distances
    let cumStepDist = 0
    const stepStartDists: number[] = []
    stepStartDists.push(0)
    for (const s of steps) { cumStepDist += s.distance; stepStartDists.push(cumStepDist) }

    const posDistAlongRoute = cumDistances[closestIdx]
    let newStepIndex = stepIndex
    for (let i = stepIndex; i < stepStartDists.length - 1; i++) {
      if (posDistAlongRoute >= stepStartDists[i] - 10) newStepIndex = i
    }

    const distToTurn = Math.max(0, stepStartDists[newStepIndex + 1] - posDistAlongRoute)
    setDistToNext(distToTurn)

    if (newStepIndex > stepIndex) setStepIndex(newStepIndex)

    // Arrived?
    const dest = route.geometry[route.geometry.length - 1]
    if (haversine(geo.position, dest) < 30) setArrived(true)

  }, [geo.position, navigating, route, stepIndex])

  function startNavigation() {
    setNavigating(true)
    setStepIndex(0)
    setFollow(true)
    followRef.current = true
  }

  function stopNavigation() {
    setNavigating(false)
    setDestination(null)
    setRoute(null)
    setArrived(false)
    setFollow(true)
  }

  const currentStep = route?.steps[stepIndex]
  const nextStep = route?.steps[stepIndex + 1]
  const remainingDist = route ? route.distance - (route.steps.slice(0, stepIndex).reduce((a, s) => a + s.distance, 0)) : 0

  // ── Default map center (world center until GPS locks) ───────────────────
  const mapCenter: [number, number] = geo.position ?? [48.8566, 2.3522]

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">

      {/* ── MAP ── */}
      <MapContainer
        center={mapCenter}
        zoom={geo.position ? 15 : 5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        className="z-0"
      >
        <TileLayer url={TILES[mode].url} attribution={TILES[mode].attribution} />

        {route && (
          <>
            <Polyline
              positions={route.geometry}
              pathOptions={{ color: MODE_COLORS[mode], weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
            />
            <Marker position={route.geometry[route.geometry.length - 1]} icon={destIcon} />
            {!navigating && <FitRoute geometry={route.geometry} />}
          </>
        )}

        {geo.position && (
          <>
            <Marker position={geo.position} icon={userIcon} />
            <CircleMarker
              center={geo.position}
              radius={geo.accuracy > 0 ? Math.min(geo.accuracy / 3, 60) : 20}
              pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.08, weight: 1 }}
            />
          </>
        )}

        <RecenterMap pos={geo.position} follow={navigating && follow} />
      </MapContainer>

      {/* ── TOP OVERLAY: Search + Mode ── */}
      {!navigating && (
        <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex flex-col gap-3"
          style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.85) 60%, transparent)' }}>
          {/* App name */}
          <div className="flex items-center justify-between">
            <span className="text-white font-black text-xl tracking-tight">🛴 ScootWay</span>
            <button
              onClick={() => setShowModePanel(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-lg ${MODE_CONFIG[mode].bg}`}
            >
              {MODE_CONFIG[mode].emoji} {MODE_CONFIG[mode].name}
              <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Mode selector */}
          {showModePanel && (
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(MODE_CONFIG) as RouteMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setShowModePanel(false) }}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-white font-semibold text-xs shadow-lg transition-all
                    ${mode === m ? `${MODE_CONFIG[m].bg} scale-105 ring-2 ring-white` : 'bg-white/10 backdrop-blur'}`}
                >
                  <span className="text-xl">{MODE_CONFIG[m].emoji}</span>
                  <span>{MODE_CONFIG[m].name}</span>
                </button>
              ))}
            </div>
          )}

          <SearchBar
            onSelect={r => { setDestination(r); setShowModePanel(false) }}
            placeholder="Où vas-tu ?"
          />
        </div>
      )}

      {/* ── GPS error banner ── */}
      {geo.error && (
        <div className="absolute top-28 left-4 right-4 z-[1000] bg-red-500/90 backdrop-blur rounded-xl px-4 py-3 text-white text-sm font-medium shadow-xl">
          📍 {geo.error}
        </div>
      )}

      {/* ── Route preview panel ── */}
      {route && !navigating && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.95) 80%, transparent)' }}>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-3">
            <p className="text-white font-bold text-base truncate mb-3">
              📍 {destination?.display_name.split(',')[0]}
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { v: formatDistance(route.distance), l: 'Distance' },
                { v: formatDuration(route.duration), l: 'Durée' },
                { v: formatETA(route.duration), l: 'Arrivée' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <p className="text-white font-bold text-lg">{v}</p>
                  <p className="text-white/50 text-xs">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={stopNavigation}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={startNavigation}
                className={`flex-[2] py-3 rounded-xl text-white font-bold text-base shadow-xl ${MODE_CONFIG[mode].bg}`}
              >
                🛴 Démarrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Computing spinner ── */}
      {computing && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur px-5 py-3 rounded-full text-white text-sm font-medium shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Calcul de l'itinéraire…
        </div>
      )}

      {routeError && (
        <div className="absolute bottom-8 left-4 right-4 z-[1000] bg-red-500/90 backdrop-blur rounded-xl px-4 py-3 text-white text-sm font-medium shadow-xl">
          ⚠️ {routeError}
        </div>
      )}

      {/* ── NAVIGATION MODE ── */}
      {navigating && route && currentStep && !arrived && (
        <>
          {/* Turn instruction */}
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <TurnInstruction
              step={currentStep}
              nextStep={nextStep}
              distanceToTurn={distToNext}
              mode={mode}
            />
          </div>

          {/* Bottom navigation HUD */}
          <div className="absolute bottom-0 left-0 right-0 z-[1000]"
            style={{ background: 'linear-gradient(to top, rgba(15,23,42,1) 80%, transparent)' }}>
            <div className="p-4 flex items-center gap-4">
              {/* Speedometer */}
              <div className="shrink-0">
                <Speedometer speed={geo.speed} />
              </div>

              {/* Route info */}
              <div className="flex-1">
                <div className="mb-2">
                  <p className="text-white/50 text-xs">Restant</p>
                  <p className="text-white font-bold text-xl">{formatDistance(remainingDist)}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-white/50 text-xs">Durée</p>
                    <p className="text-white font-semibold text-sm">{formatDuration(remainingDist / 15 * 3.6)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Arrivée</p>
                    <p className="text-white font-semibold text-sm">{formatETA(remainingDist / 15 * 3.6)}</p>
                  </div>
                </div>
              </div>

              {/* Stop button */}
              <button
                onClick={stopNavigation}
                className="shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>

            {/* Re-center button */}
            {!follow && (
              <button
                onClick={() => { setFollow(true); followRef.current = true }}
                className="absolute bottom-full right-4 mb-2 bg-white rounded-full p-2.5 shadow-xl"
              >
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Arrived screen ── */}
      {arrived && navigating && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center p-8"
          style={{ background: 'rgba(15,23,42,0.95)' }}>
          <span className="text-7xl mb-6">🏁</span>
          <h2 className="text-white text-2xl font-black mb-2">Vous êtes arrivé !</h2>
          <p className="text-white/60 text-sm mb-8 text-center">
            {destination?.display_name.split(',')[0]}
          </p>
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-white font-bold text-xl">{formatDistance(route?.distance ?? 0)}</p>
              <p className="text-white/50 text-xs mt-1">Parcourus</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-white font-bold text-xl">{formatDuration(route?.duration ?? 0)}</p>
              <p className="text-white/50 text-xs mt-1">Durée</p>
            </div>
          </div>
          <button
            onClick={stopNavigation}
            className={`w-full py-4 rounded-2xl text-white font-bold text-lg ${MODE_CONFIG[mode].bg}`}
          >
            Retour à la carte
          </button>
        </div>
      )}

      {/* ── Locate me button (when not navigating) ── */}
      {!navigating && (
        <button
          onClick={() => setFollow(true)}
          className="absolute bottom-6 right-4 z-[1000] bg-white rounded-full p-3 shadow-xl"
        >
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z" />
          </svg>
        </button>
      )}
    </div>
  )
}
