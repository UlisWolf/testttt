import { useState, useRef, useEffect } from 'react'
import { searchPlace, type GeoResult } from '../services/geocoding'

interface SearchBarProps {
  onSelect: (result: GeoResult) => void
  placeholder?: string
}

export default function SearchBar({ onSelect, placeholder = 'Chercher une destination…' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await searchPlace(query)
        setResults(r)
        setOpen(true)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 400)
  }, [query])

  function handleSelect(r: GeoResult) {
    setQuery(r.display_name.split(',')[0])
    setOpen(false)
    onSelect(r)
    inputRef.current?.blur()
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <span className="pl-4 text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 py-4 px-3 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none bg-transparent"
        />
        {loading && (
          <span className="pr-4">
            <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="pr-4 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[2000] overflow-hidden">
          {results.map((r, i) => {
            const parts = r.display_name.split(',')
            const main = parts[0]
            const sub = parts.slice(1, 3).join(',').trim()
            return (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0"
              >
                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{main}</p>
                  <p className="text-xs text-slate-400 truncate">{sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
