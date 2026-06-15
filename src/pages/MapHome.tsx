import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import SearchBar from '../components/SearchBar'
import Speedometer from '../components/Speedometer'
import TurnInstruction from '../components/TurnInstruction'
import { useGeolocation } from '../hooks/useGeolocation'
import { computeRoute, formatDistance, formatDuration, formatETA, haversine } from '../services/routing'
import type { ComputedRoute, RouteMode } from '../services/routing'
import type { GeoResult } from '../services/geocoding'

// ── Tile layers ───────────────────────────────────────────────────────────────
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

const MODE_CONFIG: Record<RouteMode, { emoji: string; name: string; bg: string; ring: string }> = {
  nuit:        { emoji: '🌙', name: 'Nuit',        bg: 'bg-indigo-600',  ring: 'ring-indigo-400' },
  securite:    { emoji: '🛡️', name: 'Sécurité',    bg: 'bg-orange-500',  ring: 'ring-orange-400' },
  chill:       { emoji: '🌿', name: 'Chill',        bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  panoramique: { emoji: '🏛️', name: 'Panoramique', bg: 'bg-amber-500',   ring: 'ring-amber-400' },
}

// ── Arrow icon: rotates with GPS heading ──────────────────────────────────────
function makeArrowIcon(heading: number, isMoving: boolean): L.DivIcon {
  const deg = isMoving ? heading : 0
  return L.divIcon({
    html: `<div style="
        width:52px;height:52px;
        transform:rotate(${deg}deg);
        transform-origin:center center;
        transition:transform 0.4s ease;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));
      ">
      <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer glow -->
        <circle cx="26" cy="26" r="22" fill="rgba(79,70,229,0.18)"/>
        <!-- Arrow body: points up (north = 0°) -->
        <path d="M26 8 L38 40 L26 33 L14 40 Z"
          fill="#4f46e5"
          stroke="white"
          stroke-width="2.5"
          stroke-linejoin="round"/>
        <!-- Center dot -->
        <circle cx="26" cy="26" r="3" fill="white" opacity="0.8"/>
      </svg>
    </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    className: '',
  })
}

const destIcon = L.divIcon({
  html: `<div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.4))">
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="48">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#ef4444"/>
      <circle cx="18" cy="18" r="7" fill="white"/>
    </svg>
  </div>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  className: '',
})

// ── Map helpers ───────────────────────────────────────────────────────────────
function RecenterMap({ pos, follow }: { pos: [number, number] | null; follow: boolean }) {
  const map = useMap()
  const prevPos = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (!pos || !follow) return
    if (!prevPos.current ||
        haversine(prevPos.current, pos) > 5) {
      map.setView(pos, Math.max(map.getZoom(), 16), { animate: true, duration: 0.8 })
      prevPos.current = pos
    }
  }, [pos, follow, map])
  return null
}

function FitRoute({ geometry }: { geometry: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (geometry.length > 1) {
      map.fitBounds(L.latLngBounds(geometry), { padding: [70, 30], animate: true })
    }
  }, [geometry, map])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [follow, setFollow] = useState(true)

  const geo = useGeolocation(true)

  // Rotating arrow — only rotates when moving (speed > 2 km/h)
  const arrowIcon = useMemo(
    () => makeArrowIcon(geo.heading ?? 0, (geo.speed ?? 0) > 2),
    [geo.heading, geo.speed]
  )

  // ── Route calculation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!destination || !geo.position) return
    setRouteError(null)
    setComputing(true)
    setRoute(null)
    setNavigating(false)
    setStepIndex(0)
    setArrived(false)
    computeRoute(geo.position, [destination.lat, destination.lng])
      .then(r => { setRoute(r); setFollow(false) })
      .catch(e => setRouteError(e.message))
      .finally(() => setComputing(false))
  }, [destination])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation tracking ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigating || !route || !geo.position) return
    const steps = route.steps
    if (stepIndex >= steps.length) return

    let minDist = Infinity
    let closestIdx = 0
    for (let i = 0; i < route.geometry.length; i++) {
      const d = haversine(geo.position, route.geometry[i])
      if (d < minDist) { minDist = d; closestIdx = i }
    }

    const cumDistances: number[] = [0]
    for (let i = 1; i < route.geometry.length; i++) {
      cumDistances.push(cumDistances[i - 1] + haversine(route.geometry[i - 1], route.geometry[i]))
    }

    let cumStepDist = 0
    const stepStartDists: number[] = [0]
    for (const s of steps) { cumStepDist += s.distance; stepStartDists.push(cumStepDist) }

    const posAlong = cumDistances[closestIdx]
    let newStep = stepIndex
    for (let i = stepIndex; i < stepStartDists.length - 1; i++) {
      if (posAlong >= stepStartDists[i] - 10) newStep = i
    }

    setDistToNext(Math.max(0, stepStartDists[newStep + 1] - posAlong))
    if (newStep > stepIndex) setStepIndex(newStep)

    const dest = route.geometry[route.geometry.length - 1]
    if (haversine(geo.position, dest) < 30) setArrived(true)
  }, [geo.position, navigating, route, stepIndex])

  function startNavigation() {
    setNavigating(true)
    setStepIndex(0)
    setFollow(true)
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
  const elapsedDist = route?.steps.slice(0, stepIndex).reduce((a, s) => a + s.distance, 0) ?? 0
  const remainingDist = (route?.distance ?? 0) - elapsedDist
  const mapCenter: [number, number] = geo.position ?? [48.8566, 2.3522]

  return (
    <div className="relative w-full overflow-hidden bg-slate-900"
      style={{ height: '100dvh' }}>

      {/* ── MAP ─────────────────────────────────────────────────────────── */}
      <MapContainer
        center={mapCenter}
        zoom={geo.position ? 15 : 5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer url={TILES[mode].url} attribution={TILES[mode].attribution} />

        {route && (
          <>
            {/* Route shadow for depth */}
            <Polyline
              positions={route.geometry}
              pathOptions={{ color: '#000', weight: 10, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={route.geometry}
              pathOptions={{ color: MODE_COLORS[mode], weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
            <Marker position={route.geometry[route.geometry.length - 1]} icon={destIcon} />
            {!navigating && <FitRoute geometry={route.geometry} />}
          </>
        )}

        {geo.position && (
          <>
            {/* Accuracy circle */}
            {geo.accuracy > 0 && (
              <CircleMarker
                center={geo.position}
                radius={Math.min(Math.max(geo.accuracy / 2, 12), 80)}
                pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.07, weight: 1.5, opacity: 0.4 }}
              />
            )}
            {/* Directional arrow */}
            <Marker position={geo.position} icon={arrowIcon} />
          </>
        )}

        <RecenterMap pos={geo.position} follow={(navigating || follow)} />
      </MapContainer>

      {/* ── TOP: Search + Mode selector ─────────────────────────────────── */}
      {!navigating && (
        <div
          className="absolute top-0 left-0 right-0 z-[1000] flex flex-col gap-3"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
            paddingLeft: 16, paddingRight: 16, paddingBottom: 16,
            background: 'linear-gradient(to bottom, rgba(15,23,42,0.92) 65%, transparent)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-white font-black text-xl tracking-tight drop-shadow">🛴 ScootWay</span>
            <button
              onClick={() => setShowModePanel(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white shadow-lg active:scale-95 transition-transform ${MODE_CONFIG[mode].bg}`}
              style={{ minHeight: 40 }}
            >
              {MODE_CONFIG[mode].emoji} {MODE_CONFIG[mode].name}
              <svg className={`w-3 h-3 opacity-70 transition-transform ${showModePanel ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Mode grid */}
          {showModePanel && (
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(MODE_CONFIG) as RouteMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setShowModePanel(false) }}
                  style={{ minHeight: 64 }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-white text-xs font-bold shadow-lg active:scale-95 transition-all
                    ${mode === m ? `${MODE_CONFIG[m].bg} ring-2 ring-white ring-offset-1 ring-offset-transparent` : 'bg-white/15 backdrop-blur-sm'}`}
                >
                  <span className="text-2xl leading-none">{MODE_CONFIG[m].emoji}</span>
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

      {/* ── GPS permission error ─────────────────────────────────────────── */}
      {geo.error && !navigating && (
        <div className="absolute z-[1000] left-4 right-4 bg-red-500/95 backdrop-blur-sm rounded-2xl px-4 py-3.5 text-white text-sm font-semibold shadow-2xl flex items-center gap-3"
          style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 130px), 150px)' }}>
          <span className="text-xl">📍</span>
          <span>{geo.error}</span>
        </div>
      )}

      {/* ── Route preview ────────────────────────────────────────────────── */}
      {route && !navigating && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000]"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
            background: 'linear-gradient(to top, rgba(15,23,42,0.97) 75%, transparent)',
          }}
        >
          <div className="px-4 pt-6 pb-2">
            {/* Destination name */}
            <p className="text-white font-black text-lg truncate mb-1 drop-shadow">
              📍 {destination?.display_name.split(',')[0]}
            </p>
            <p className="text-white/50 text-xs truncate mb-4">
              {destination?.display_name.split(',').slice(1, 3).join(',')}
            </p>

            {/* Stats row */}
            <div className="flex gap-3 mb-5">
              {[
                { v: formatDistance(route.distance), l: 'Distance', icon: '📏' },
                { v: formatDuration(route.duration), l: 'Durée',    icon: '⏱️' },
                { v: formatETA(route.duration),      l: 'Arrivée',  icon: '🕐' },
              ].map(({ v, l, icon }) => (
                <div key={l} className="flex-1 bg-white/10 rounded-2xl py-3 px-2 text-center">
                  <div className="text-base mb-0.5">{icon}</div>
                  <p className="text-white font-bold text-base leading-tight">{v}</p>
                  <p className="text-white/40 text-xs mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={stopNavigation}
                style={{ minHeight: 54 }}
                className="flex-1 rounded-2xl bg-white/10 text-white font-semibold text-sm active:scale-95 transition-transform"
              >
                ✕ Annuler
              </button>
              <button
                onClick={startNavigation}
                style={{ minHeight: 54 }}
                className={`flex-[2.5] rounded-2xl text-white font-black text-base shadow-2xl active:scale-95 transition-transform ${MODE_CONFIG[mode].bg}`}
              >
                🛴 Démarrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Computing spinner ────────────────────────────────────────────── */}
      {computing && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-sm px-5 py-3 rounded-full text-white text-sm font-semibold shadow-2xl flex items-center gap-2.5 whitespace-nowrap">
          <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Calcul de l'itinéraire…
        </div>
      )}

      {routeError && (
        <div className="absolute bottom-32 left-4 right-4 z-[1000] bg-red-500/95 backdrop-blur-sm rounded-2xl px-4 py-3.5 text-white text-sm font-semibold shadow-2xl">
          ⚠️ {routeError}
        </div>
      )}

      {/* ── NAVIGATION HUD ───────────────────────────────────────────────── */}
      {navigating && route && currentStep && !arrived && (
        <>
          {/* Turn instruction — top with safe area */}
          <div
            className="absolute left-0 right-0 z-[1000] px-4"
            style={{ top: 'max(env(safe-area-inset-top, 0px), 12px)' }}
          >
            <TurnInstruction
              step={currentStep}
              nextStep={nextStep}
              distanceToTurn={distToNext}
              mode={mode}
            />
          </div>

          {/* Speed + route info — bottom HUD */}
          <div
            className="absolute bottom-0 left-0 right-0 z-[1000]"
            style={{
              background: 'linear-gradient(to top, rgba(15,23,42,1) 70%, rgba(15,23,42,0.85) 100%)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            }}
          >
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              {/* Speedometer */}
              <Speedometer speed={geo.speed} />

              {/* Distance + time info */}
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Restant</p>
                  <p className="text-white font-black text-2xl leading-tight">{formatDistance(remainingDist)}</p>
                </div>
                <div className="flex gap-5">
                  <div>
                    <p className="text-white/40 text-xs">Durée</p>
                    <p className="text-white font-bold text-sm">{formatDuration(remainingDist / 15 * 3.6)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">ETA</p>
                    <p className="text-white font-bold text-sm">{formatETA(remainingDist / 15 * 3.6)}</p>
                  </div>
                </div>
              </div>

              {/* Stop button */}
              <button
                onClick={stopNavigation}
                style={{ minWidth: 52, minHeight: 52 }}
                className="rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="5" y="5" width="14" height="14" rx="3" />
                </svg>
              </button>
            </div>

            {/* Re-center pill */}
            {!follow && (
              <div className="absolute bottom-full right-4 mb-3">
                <button
                  onClick={() => setFollow(true)}
                  className="bg-white rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-2 font-semibold text-sm text-slate-800 active:scale-95 transition-transform"
                >
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" strokeWidth={2}/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                  Recentrer
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Arrived ──────────────────────────────────────────────────────── */}
      {arrived && navigating && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center p-6"
          style={{ background: 'rgba(15,23,42,0.97)' }}>
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <span className="text-5xl">🏁</span>
          </div>
          <h2 className="text-white text-3xl font-black mb-2 text-center">Arrivé !</h2>
          <p className="text-white/50 text-sm mb-8 text-center px-6">
            {destination?.display_name.split(',')[0]}
          </p>
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            {[
              { v: formatDistance(route?.distance ?? 0), l: 'Parcourus', icon: '📏' },
              { v: formatDuration(route?.duration ?? 0), l: 'Durée', icon: '⏱️' },
            ].map(({ v, l, icon }) => (
              <div key={l} className="bg-white/10 rounded-2xl p-5 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-white font-bold text-xl">{v}</p>
                <p className="text-white/40 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
          <button
            onClick={stopNavigation}
            style={{ minHeight: 56 }}
            className={`w-full rounded-2xl text-white font-black text-lg shadow-2xl active:scale-95 transition-transform ${MODE_CONFIG[mode].bg}`}
          >
            Retour à la carte
          </button>
        </div>
      )}

      {/* ── Locate me FAB (idle mode) ─────────────────────────────────── */}
      {!navigating && !route && (
        <button
          onClick={() => { setFollow(true) }}
          style={{
            bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)',
            minWidth: 52, minHeight: 52,
          }}
          className="absolute right-4 z-[1000] bg-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}
    </div>
  )
}
