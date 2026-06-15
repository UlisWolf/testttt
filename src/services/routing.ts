// Routing via OSRM public API (OpenStreetMap) — free, no API key
// Using "bike" profile which suits e-scooters

export type RouteMode = 'nuit' | 'securite' | 'chill' | 'panoramique'

export interface RouteStep {
  instruction: string
  distance: number   // meters
  duration: number   // seconds
  maneuver: string   // turn type
  streetName: string
  bearing: number
}

export interface ComputedRoute {
  geometry: [number, number][]   // [lat, lng] array
  distance: number               // meters
  duration: number               // seconds
  steps: RouteStep[]
}

const OSRM = 'https://router.project-osrm.org/route/v1/bike'

function osrmManeuverToFrench(type: string, modifier?: string): string {
  const turns: Record<string, string> = {
    turn: modifier === 'left' ? 'Tournez à gauche' :
          modifier === 'right' ? 'Tournez à droite' :
          modifier === 'slight left' ? 'Légèrement à gauche' :
          modifier === 'slight right' ? 'Légèrement à droite' :
          modifier === 'sharp left' ? 'Virage serré à gauche' :
          modifier === 'sharp right' ? 'Virage serré à droite' :
          modifier === 'uturn' ? 'Demi-tour' : 'Continuez tout droit',
    'new name': 'Continuez sur',
    depart: 'Départ',
    arrive: 'Vous êtes arrivé',
    merge: 'Rejoignez',
    'on ramp': 'Prenez la rampe',
    'off ramp': 'Quittez la rampe',
    fork: modifier?.includes('left') ? 'À la fourche, prenez à gauche' : 'À la fourche, prenez à droite',
    'end of road': modifier === 'left' ? 'Au bout, tournez à gauche' : 'Au bout, tournez à droite',
    roundabout: 'Prenez le rond-point',
    rotary: 'Prenez le giratoire',
    continue: 'Continuez',
  }
  return turns[type] ?? 'Continuez'
}

export async function computeRoute(
  from: [number, number],
  to: [number, number],
): Promise<ComputedRoute> {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`
  const url = `${OSRM}/${coords}?steps=true&geometries=geojson&overview=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Routing failed')
  const data = await res.json()

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Aucun itinéraire trouvé')
  }

  const route = data.routes[0]
  const leg = route.legs[0]

  const geometry: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  )

  const steps: RouteStep[] = leg.steps.map((s: any) => ({
    instruction: osrmManeuverToFrench(s.maneuver.type, s.maneuver.modifier),
    distance: s.distance,
    duration: s.duration,
    maneuver: s.maneuver.type,
    streetName: s.name || '',
    bearing: s.maneuver.bearing_after ?? 0,
  }))

  return {
    geometry,
    distance: route.distance,
    duration: route.duration,
    steps,
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h${rem.toString().padStart(2, '0')}` : `${h}h`
}

export function formatETA(seconds: number): string {
  const now = new Date()
  now.setSeconds(now.getSeconds() + seconds)
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Haversine distance in meters between two [lat,lng]
export function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
