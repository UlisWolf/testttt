import { formatDistance } from '../services/routing'
import type { RouteStep } from '../services/routing'
import type { RouteMode } from '../services/routing'

const MODE_COLORS: Record<RouteMode, string> = {
  nuit: 'from-indigo-900 to-purple-900',
  securite: 'from-orange-600 to-red-600',
  chill: 'from-emerald-600 to-teal-600',
  panoramique: 'from-amber-500 to-orange-500',
}

const MODE_EMOJI: Record<RouteMode, string> = {
  nuit: '🌙', securite: '🛡️', chill: '🌿', panoramique: '🏛️',
}

function ManeuverIcon({ type, modifier }: { type: string; modifier?: string }) {
  const isLeft = modifier?.includes('left')
  const isRight = modifier?.includes('right')
  const isSharp = modifier?.includes('sharp')

  if (type === 'arrive') return <span className="text-2xl">🏁</span>
  if (type === 'depart') return <span className="text-2xl">🚀</span>
  if (type === 'roundabout' || type === 'rotary') return <span className="text-2xl">🔄</span>

  return (
    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      {isLeft && !isSharp && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      )}
      {isRight && !isSharp && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      )}
      {(!isLeft && !isRight) && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      )}
    </svg>
  )
}

interface TurnInstructionProps {
  step: RouteStep
  nextStep?: RouteStep
  distanceToTurn: number   // meters
  mode: RouteMode
}

export default function TurnInstruction({ step, nextStep, distanceToTurn, mode }: TurnInstructionProps) {
  const urgent = distanceToTurn < 50

  return (
    <div className={`w-full bg-gradient-to-r ${MODE_COLORS[mode]} rounded-2xl shadow-2xl overflow-hidden`}>
      <div className="flex items-center gap-4 p-4">
        <div className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
          ${urgent ? 'bg-white/30 animate-pulse' : 'bg-white/15'}`}>
          <ManeuverIcon type={step.maneuver} modifier={step.streetName} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-tight">
            {step.instruction}
            {step.streetName && <span className="font-normal"> · {step.streetName}</span>}
          </p>
          <p className="text-white/60 text-sm mt-0.5">
            Dans <span className={`font-bold ${urgent ? 'text-yellow-300' : 'text-white'}`}>
              {formatDistance(distanceToTurn)}
            </span>
          </p>
        </div>
        <span className="shrink-0 text-xl">{MODE_EMOJI[mode]}</span>
      </div>

      {nextStep && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-white/10 pt-2">
          <span className="text-white/40 text-xs">Ensuite :</span>
          <span className="text-white/60 text-xs truncate">{nextStep.instruction}</span>
        </div>
      )}
    </div>
  )
}
