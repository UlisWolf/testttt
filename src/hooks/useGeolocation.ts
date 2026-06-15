import { useState, useEffect, useRef } from 'react'

export interface GeoState {
  position: [number, number] | null
  speed: number        // km/h
  heading: number      // degrees
  accuracy: number     // meters
  error: string | null
  loading: boolean
}

export function useGeolocation(active = true) {
  const [state, setState] = useState<GeoState>({
    position: null,
    speed: 0,
    heading: 0,
    accuracy: 0,
    error: null,
    loading: true,
  })
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'GPS non disponible sur cet appareil', loading: false }))
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKmh = pos.coords.speed != null && pos.coords.speed >= 0
          ? pos.coords.speed * 3.6
          : 0
        setState({
          position: [pos.coords.latitude, pos.coords.longitude],
          speed: speedKmh,
          heading: pos.coords.heading ?? 0,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState(s => ({
          ...s,
          error: err.code === 1 ? 'Autorise la localisation pour utiliser le GPS'
               : err.code === 2 ? 'Position GPS indisponible'
               : 'Délai GPS dépassé',
          loading: false,
        }))
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    )

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [active])

  return state
}
