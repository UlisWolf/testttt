import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ScootRoute } from '../types'

function FitBounds({ waypoints }: { waypoints: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(([lat, lng]) => [lat, lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, waypoints])
  return null
}

const startIcon = L.divIcon({
  html: '<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
})

const endIcon = L.divIcon({
  html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
})

interface RouteMapProps {
  route: ScootRoute
}

export default function RouteMap({ route }: RouteMapProps) {
  const start = route.waypoints[0]
  const end = route.waypoints[route.waypoints.length - 1]

  return (
    <MapContainer
      center={start}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FitBounds waypoints={route.waypoints} />

      <Polyline
        positions={route.waypoints}
        pathOptions={{ color: route.color, weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
      />

      <Marker position={start} icon={startIcon}>
        <Popup className="poi-popup">
          <div>
            <p className="font-bold text-emerald-600 text-sm">🚀 Départ</p>
          </div>
        </Popup>
      </Marker>

      <Marker position={end} icon={endIcon}>
        <Popup className="poi-popup">
          <div>
            <p className="font-bold text-red-500 text-sm">🏁 Arrivée</p>
          </div>
        </Popup>
      </Marker>

      {route.pois.map((poi, i) => (
        <CircleMarker
          key={i}
          center={[poi.lat, poi.lng]}
          radius={10}
          pathOptions={{ color: route.color, fillColor: 'white', fillOpacity: 1, weight: 2.5 }}
        >
          <Popup className="poi-popup">
            <div>
              <p className="font-bold text-sm text-slate-800">
                {poi.icon} {poi.name}
              </p>
              {poi.description && (
                <p className="text-xs text-slate-500 mt-1">{poi.description}</p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
