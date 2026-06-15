interface ScoreBarProps {
  score: number
  label: string
  color: string
}

export default function ScoreBar({ score, label, color }: ScoreBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
