import { ArrowDown, ArrowUp, Check, Guitar, LoaderCircle, Mic, MicOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const strings = [
  { id: 6, note: 'E', label: 'Mi grave', frequency: 82.41 },
  { id: 5, note: 'A', label: 'Lá', frequency: 110 },
  { id: 4, note: 'D', label: 'Ré', frequency: 146.83 },
  { id: 3, note: 'G', label: 'Sol', frequency: 196 },
  { id: 2, note: 'B', label: 'Si', frequency: 246.94 },
  { id: 1, note: 'E', label: 'Mi agudo', frequency: 329.63 },
] as const

type StringId = (typeof strings)[number]['id']
type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'

const detectPitch = (buffer: Float32Array, sampleRate: number, targetFrequency: number) => {
  let mean = 0
  for (const sample of buffer) mean += sample
  mean /= buffer.length

  let rms = 0
  for (const sample of buffer) {
    const centered = sample - mean
    rms += centered * centered
  }
  rms = Math.sqrt(rms / buffer.length)
  if (rms < 0.007) return null

  const minFrequency = targetFrequency * 0.72
  const maxFrequency = targetFrequency * 1.35
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency))
  const maxLag = Math.min(Math.ceil(sampleRate / minFrequency), buffer.length - 2)
  const correlations = new Float32Array(maxLag + 1)
  let bestLag = -1
  let bestCorrelation = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    let energyA = 0
    let energyB = 0
    const sampleCount = Math.min(2048, buffer.length - lag)
    for (let index = 0; index < sampleCount; index += 1) {
      const a = buffer[index] - mean
      const b = buffer[index + lag] - mean
      correlation += a * b
      energyA += a * a
      energyB += b * b
    }
    const normalized = correlation / Math.sqrt(energyA * energyB)
    correlations[lag] = normalized
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized
      bestLag = lag
    }
  }

  if (bestLag < 0 || bestCorrelation < 0.78) return null

  const previous = correlations[bestLag - 1]
  const current = correlations[bestLag]
  const next = correlations[bestLag + 1]
  const denominator = previous - (2 * current) + next
  const adjustment = denominator === 0 ? 0 : 0.5 * (previous - next) / denominator
  const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, adjustment))
  const frequency = sampleRate / refinedLag

  if (frequency < minFrequency || frequency > maxFrequency) return null
  return { frequency, clarity: bestCorrelation }
}

export function GuitarTuner({ onClose, onContinue, continueLabel }: { onClose: () => void; onContinue: () => void; continueLabel?: string }) {
  const [selectedString, setSelectedString] = useState<StringId>(6)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [frequency, setFrequency] = useState<number | null>(null)
  const [cents, setCents] = useState<number | null>(null)
  const [tunedStrings, setTunedStrings] = useState<Set<StringId>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const stableFramesRef = useRef(0)
  const selectedStringRef = useRef<StringId>(6)
  const tunedStringsRef = useRef<Set<StringId>>(new Set())
  const pitchHistoryRef = useRef<number[]>([])
  const lastAnalysisRef = useRef(0)
  const meterRef = useRef<HTMLDivElement | null>(null)
  const activateRef = useRef<HTMLButtonElement | null>(null)
  const nextStringRef = useRef<HTMLButtonElement | null>(null)
  const continueRef = useRef<HTMLButtonElement | null>(null)

  const target = strings.find((item) => item.id === selectedString) ?? strings[0]
  const inTune = cents !== null && Math.abs(cents) <= 7

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    void audioContextRef.current?.close()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      activateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      activateRef.current?.focus({ preventScroll: true })
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const focusElement = (element: HTMLElement | null) => {
    requestAnimationFrame(() => element?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const selectString = (stringId: StringId, follow = true) => {
    selectedStringRef.current = stringId
    setSelectedString(stringId)
    stableFramesRef.current = 0
    pitchHistoryRef.current = []
    setFrequency(null)
    setCents(null)
    if (follow) focusElement(meterRef.current)
  }

  const enableMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unsupported')
      return
    }

    setMicStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const context = new AudioContext()
      await context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.15
      context.createMediaStreamSource(stream).connect(analyser)

      streamRef.current = stream
      audioContextRef.current = context
      setMicStatus('active')
      focusElement(meterRef.current)
      const samples = new Float32Array(analyser.fftSize)

      const analyze = (timestamp: number) => {
        if (timestamp - lastAnalysisRef.current < 70) {
          frameRef.current = requestAnimationFrame(analyze)
          return
        }
        lastAnalysisRef.current = timestamp
        analyser.getFloatTimeDomainData(samples)
        const activeTarget = strings.find((item) => item.id === selectedStringRef.current) ?? strings[0]
        const detected = detectPitch(samples, context.sampleRate, activeTarget.frequency)
        if (!detected) {
          setFrequency(null)
          setCents(null)
          stableFramesRef.current = 0
          pitchHistoryRef.current = []
        } else {
          pitchHistoryRef.current = [...pitchHistoryRef.current.slice(-4), detected.frequency]
          const ordered = [...pitchHistoryRef.current].sort((a, b) => a - b)
          const smoothedFrequency = ordered[Math.floor(ordered.length / 2)]
          const offset = Math.round(1200 * Math.log2(smoothedFrequency / activeTarget.frequency))
          setFrequency(smoothedFrequency)
          setCents(offset)
          if (Math.abs(offset) <= 6 && detected.clarity >= 0.82) {
            stableFramesRef.current += 1
            if (stableFramesRef.current === 8) {
              const updated = new Set(tunedStringsRef.current).add(activeTarget.id)
              tunedStringsRef.current = updated
              setTunedStrings(updated)
              setTimeout(() => focusElement(updated.size === strings.length ? continueRef.current : nextStringRef.current), 120)
            }
          } else if (Math.abs(offset) > 10) {
            stableFramesRef.current = 0
          }
        }
        frameRef.current = requestAnimationFrame(analyze)
      }
      frameRef.current = requestAnimationFrame(analyze)
    } catch {
      setMicStatus('denied')
    }
  }

  const status = cents === null
    ? { text: 'Toque apenas a corda selecionada', color: 'text-slate-300', icon: <Guitar className="size-5" /> }
    : inTune
      ? { text: 'Afinada!', color: 'text-emerald-300', icon: <Check className="size-5" /> }
      : cents < 0
        ? { text: 'Está baixa · aperte a corda', color: 'text-cyan-200', icon: <ArrowUp className="size-5" /> }
        : { text: 'Está alta · afrouxe a corda', color: 'text-amber-300', icon: <ArrowDown className="size-5" /> }

  const currentIndex = strings.findIndex((item) => item.id === selectedString)
  const nextUntunedString = strings.slice(currentIndex + 1).find((item) => !tunedStrings.has(item.id))
    ?? strings.find((item) => !tunedStrings.has(item.id))

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#020817]/95 px-3 py-4 backdrop-blur-sm sm:grid sm:place-items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="tuner-title" className="game-shell mx-auto w-full max-w-xl rounded-[2rem] p-3 sm:p-5">
        <div className="rounded-[1.6rem] border border-white/[0.07] bg-[#09162a] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Preparação</p>
              <h2 id="tuner-title" className="mt-2 font-display text-3xl font-bold">Afine seu violão</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">Escolha uma corda e toque somente ela. Deixe o ponteiro chegar ao centro.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar afinador" className="game-pill grid size-10 shrink-0 place-items-center rounded-full"><X className="size-4" /></button>
          </div>

          <div className="mt-5 grid grid-cols-6 gap-2">
            {strings.map((item) => {
              const selected = item.id === selectedString
              const tuned = tunedStrings.has(item.id)
              return (
                <button key={item.id} type="button" onClick={() => selectString(item.id)} aria-label={`${item.id}ª corda, ${item.label}`} className={`relative rounded-xl border px-1 py-3 text-center transition ${selected ? 'border-cyan-200 bg-cyan-300/15 shadow-[0_4px_0_#0e7490]' : 'border-white/10 bg-white/[0.03]'}`}>
                  {tuned && <Check className="absolute right-1 top-1 size-3 text-emerald-300" />}
                  <span className="block text-lg font-bold text-white">{item.note}</span>
                  <span className="mt-1 block text-[9px] text-slate-500">{item.id}ª</span>
                </button>
              )
            })}
          </div>

          <div ref={meterRef} className="game-card mt-5 scroll-mt-4 rounded-2xl border-cyan-300/20 p-5 text-center">
            <p className="text-xs text-slate-400">{target.id}ª corda · {target.label} · {target.frequency.toFixed(2)} Hz</p>
            <p className="mt-2 font-display text-6xl font-bold text-white">{target.note}</p>
            <div className="relative mt-6 h-3 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-amber-300">
              <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
              {cents !== null && <div className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#07101f] shadow-lg transition-all" style={{ left: `${50 + Math.max(-45, Math.min(45, cents * 0.75))}%` }} />}
            </div>
            <div className={`mt-6 flex items-center justify-center gap-2 font-semibold ${status.color}`}>{status.icon}<span>{status.text}</span></div>
            <p className="mt-2 text-xs text-slate-500">{frequency ? `${frequency.toFixed(1)} Hz · ${cents && cents > 0 ? '+' : ''}${cents ?? 0} cents` : 'Aguardando o som da corda'}</p>
            {tunedStrings.has(selectedString) && nextUntunedString && (
              <button ref={nextStringRef} type="button" onClick={() => selectString(nextUntunedString.id)} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">
                Próxima corda · {nextUntunedString.note} ({nextUntunedString.id}ª)
              </button>
            )}
          </div>

          {micStatus !== 'active' && (
            <button ref={activateRef} type="button" disabled={micStatus === 'requesting'} onClick={() => void enableMicrophone()} className="game-button mt-5 inline-flex w-full scroll-mb-4 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">
              {micStatus === 'requesting' ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}
              {micStatus === 'requesting' ? 'Abrindo microfone…' : 'Ativar afinador'}
            </button>
          )}
          {micStatus === 'active' && <p className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-300"><Mic className="size-3.5" /> Microfone ativo · {tunedStrings.size}/6 cordas afinadas</p>}
          {micStatus === 'denied' && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><MicOff className="size-4" /> Libere o microfone nas configurações do navegador.</p>}
          {micStatus === 'unsupported' && <p role="alert" className="mt-3 text-xs text-amber-300">Este navegador não disponibilizou o microfone.</p>}

          <button ref={continueRef} type="button" onClick={onContinue} className="mt-4 w-full scroll-mb-4 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
            {continueLabel ?? (tunedStrings.size === 6 ? 'Violão afinado · ir para o painel' : 'Continuar para o painel')}
          </button>
        </div>
      </section>
    </div>
  )
}
