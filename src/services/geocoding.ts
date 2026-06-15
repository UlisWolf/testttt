// Geocoding via Nominatim (OpenStreetMap) — free, no API key
export interface GeoResult {
  display_name: string
  lat: number
  lng: number
  type: string
  importance: number
}

export async function searchPlace(query: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'fr', 'User-Agent': 'ScootWay/1.0' },
  })
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  return data.map((d: any) => ({
    display_name: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    type: d.type,
    importance: d.importance,
  }))
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'fr', 'User-Agent': 'ScootWay/1.0' },
  })
  if (!res.ok) return 'Position actuelle'
  const d = await res.json()
  return d.display_name ?? 'Position actuelle'
}
