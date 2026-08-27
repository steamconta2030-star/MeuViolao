type ChordName = 'Em' | 'G' | 'C' | 'D'

type ChordShape = {
  strings: Array<'open' | 'mute' | null>
  fingers: Array<{ string: number; fret: number; finger: number }>
}

const shapes: Record<ChordName, ChordShape> = {
  Em: {
    strings: ['open', null, null, 'open', 'open', 'open'],
    fingers: [{ string: 1, fret: 2, finger: 2 }, { string: 2, fret: 2, finger: 3 }],
  },
  G: {
    strings: [null, null, 'open', 'open', 'open', null],
    fingers: [{ string: 0, fret: 3, finger: 2 }, { string: 1, fret: 2, finger: 1 }, { string: 5, fret: 3, finger: 3 }],
  },
  C: {
    strings: ['mute', null, null, 'open', null, 'open'],
    fingers: [{ string: 1, fret: 3, finger: 3 }, { string: 2, fret: 2, finger: 2 }, { string: 4, fret: 1, finger: 1 }],
  },
  D: {
    strings: ['mute', 'mute', 'open', null, null, null],
    fingers: [{ string: 3, fret: 2, finger: 1 }, { string: 4, fret: 3, finger: 3 }, { string: 5, fret: 2, finger: 2 }],
  },
}

export function ChordDiagram({ chord, active = false }: { chord: ChordName; active?: boolean }) {
  const shape = shapes[chord]

  return (
    <figure className={`w-[108px] shrink-0 snap-start rounded-2xl border px-2 pb-2 pt-1 transition duration-200 ${active ? 'scale-[1.04] border-cyan-300/70 bg-cyan-300/10 shadow-lg shadow-cyan-500/10' : 'border-white/10 bg-[#0c182b] opacity-65'}`}>
      <figcaption className="text-center font-display text-xl font-semibold text-white">{chord}</figcaption>
      <svg viewBox="0 0 130 138" role="img" aria-label={`Diagrama do acorde ${chord}`} className="mt-1 w-full">
        {shape.strings.map((status, index) => (
          <text key={`status-${index}`} x={30 + index * 14} y="13" textAnchor="middle" className="fill-slate-300 text-[11px] font-semibold">
            {status === 'open' ? '○' : status === 'mute' ? '×' : ''}
          </text>
        ))}

        {[0, 1, 2, 3, 4].map((fret) => (
          <line key={`fret-${fret}`} x1="30" x2="100" y1={24 + fret * 22} y2={24 + fret * 22} stroke={fret === 0 ? '#e2e8f0' : '#64748b'} strokeWidth={fret === 0 ? 4 : 1.5} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((string) => (
          <line key={`string-${string}`} x1={30 + string * 14} x2={30 + string * 14} y1="24" y2="112" stroke="#94a3b8" strokeWidth={1 + (5 - string) * 0.12} />
        ))}

        {shape.fingers.map((position) => (
          <g key={`${position.string}-${position.fret}`}>
            <circle cx={30 + position.string * 14} cy={24 + (position.fret - 0.5) * 22} r="6.5" fill="#67e8f9" stroke="#cffafe" strokeWidth="1" />
            <text x={30 + position.string * 14} y={27 + (position.fret - 0.5) * 22} textAnchor="middle" className="fill-[#07101f] text-[9px] font-bold">{position.finger}</text>
          </g>
        ))}

        <text x="65" y="131" textAnchor="middle" className="fill-slate-400 text-[8px]">E  A  D  G  B  e</text>
      </svg>
    </figure>
  )
}
