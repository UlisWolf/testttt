interface SpeedometerProps {
  speed: number   // km/h
  maxSpeed?: number
}

export default function Speedometer({ speed, maxSpeed = 35 }: SpeedometerProps) {
  const clampedSpeed = Math.min(speed, maxSpeed)
  const pct = clampedSpeed / maxSpeed

  // Arc: 220° sweep, starting from 160° (bottom-left)
  const r = 52
  const cx = 64
  const cy = 64
  const startAngle = 150
  const sweepAngle = 240
  const endAngle = startAngle + sweepAngle * pct

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const start = polarToXY(startAngle)
  const end = polarToXY(endAngle)
  const largeArc = sweepAngle * pct > 180 ? 1 : 0

  const trackEnd = polarToXY(startAngle + sweepAngle)

  const speedColor =
    speed < 15 ? '#22c55e' :
    speed < 25 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Active arc */}
        {pct > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={speedColor}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${speedColor})` }}
          />
        )}
        {/* Center speed text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="26" fontWeight="800" fontFamily="Inter,sans-serif">
          {Math.round(speed)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontFamily="Inter,sans-serif">
          km/h
        </text>
      </svg>
    </div>
  )
}
