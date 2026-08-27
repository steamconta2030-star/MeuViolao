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

export function ChordDiagram({ chord }: { chord: ChordName }) {
  const shape = shapes[chord]

  return (
    <figure className="w-[86px] shrink-0 rounded-2xl border border-white/10 bg-[#0c182b] px-2 pb-2 pt-1">
      <figcaption className="text-center font-display text-xl font-semibold text-white">{chord}</figcaption>
      <svg viewBox="0 0 100 118" role="img" aria-label={`Diagrama do acorde ${chord}`} className="mt-1 w-full">
        {shape.strings.map((status, index) => (
          <text key={`status-${index}`} x={20 + index * 12} y="12" textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
            {status === 'open' ? '○' : status === 'mute' ? '×' : ''}
          </text>
        ))}

        {[0, 1, 2, 3, 4].map((fret) => (
          <line key={`fret-${fret}`} x1="20" x2="80" y1={22 + fret * 19} y2={22 + fret * 19} stroke={fret === 0 ? '#cbd5e1' : '#475569'} strokeWidth={fret === 0 ? 4 : 1.5} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((string) => (
          <line key={`string-${string}`} x1={20 + string * 12} x2={20 + string * 12} y1="22" y2="98" stroke="#64748b" strokeWidth={1 + (5 - string) * 0.12} />
        ))}

        {shape.fingers.map((position) => (
          <g key={`${position.string}-${position.fret}`}>
            <circle cx={20 + position.string * 12} cy={22 + (position.fret - 0.5) * 19} r="7.5" fill="#67e8f9" />
            <text x={20 + position.string * 12} y={25 + (position.fret - 0.5) * 19} textAnchor="middle" className="fill-[#07101f] text-[8px] font-bold">{position.finger}</text>
          </g>
        ))}

        <text x="50" y="112" textAnchor="middle" className="fill-slate-500 text-[7px]">E A D G B e</text>
      </svg>
    </figure>
  )
}
