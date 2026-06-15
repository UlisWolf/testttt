interface SpeedometerProps {
  speed: number   // km/h
  maxSpeed?: number
}

export default function Speedometer({ speed, maxSpeed = 35 }: SpeedometerProps) {
  const clamped = Math.min(speed, maxSpeed)
  const pct = clamped / maxSpeed
  const r = 46
  const cx = 56
  const cy = 56
  const startAngle = 145
  const sweep = 250

  function toXY(deg: number) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const arcStart = toXY(startAngle)
  const arcEnd = toXY(startAngle + sweep)
  const activeEnd = toXY(startAngle + sweep * pct)
  const largeArc = sweep * pct > 180 ? 1 : 0

  const color = speed < 15 ? '#34d399' : speed < 25 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112">
        {/* Background track */}
        <path
          d={`M${arcStart.x},${arcStart.y} A${r},${r} 0 1 1 ${arcEnd.x},${arcEnd.y}`}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" strokeLinecap="round"
        />
        {/* Active arc */}
        {pct > 0.01 && (
          <path
            d={`M${arcStart.x},${arcStart.y} A${r},${r} 0 ${largeArc} 1 ${activeEnd.x},${activeEnd.y}`}
            fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'all 0.3s ease' }}
          />
        )}
        {/* Speed number */}
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="28" fontWeight="800" fontFamily="Inter,sans-serif">
          {Math.round(speed)}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle"
          fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="Inter,sans-serif" letterSpacing="1">
          KM/H
        </text>
      </svg>
    </div>
  )
}
