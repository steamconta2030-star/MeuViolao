import { Check, Guitar, LoaderCircle, Mic, MicOff, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { averageSignatures, calibrationChords, expectedPitchClasses, extractChordSignature, saveChordCalibration, type CalibrationChord, type ChordSignature } from '../lib/chord-calibration'

const requiredSamples = 5

const emptySamples = (): Record<CalibrationChord, ChordSignature[]> => ({ Em: [], G: [], C: [], D: [] })

export function ChordCalibration({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [chordIndex, setChordIndex] = useState(0)
  const [samples, setSamples] = useState<Record<CalibrationChord, ChordSignature[]>>(emptySamples)
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle')
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'armed' | 'captured' | 'rejected'>('idle')
  const [message, setMessage] = useState('Ative o microfone para começar.')
  const [saving, setSaving] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)
  const armedRef = useRef(false)
  const captureDueRef = useRef(0)
  const noiseFloorRef = useRef(2)
  const previousEnergyRef = useRef(0)
  const activeChordRef = useRef<CalibrationChord>('Em')
  const samplesRef = useRef(samples)
  const actionRef = useRef<HTMLButtonElement | null>(null)

  const activeChord = calibrationChords[chordIndex]
  const activeSamples = samples[activeChord]
  const chordComplete = activeSamples.length >= requiredSamples
  const allComplete = calibrationChords.every((chord) => samples[chord].length >= requiredSamples)

  useEffect(() => {
    activeChordRef.current = activeChord
  }, [activeChord])

  useEffect(() => {
    samplesRef.current = samples
  }, [samples])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    void contextRef.current?.close()
  }, [])

  const followAction = () => requestAnimationFrame(() => actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))

  const enableMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unsupported')
      return
    }
    setMicStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      const context = new AudioContext()
      await context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = 8192
      analyser.smoothingTimeConstant = 0.28
      context.createMediaStreamSource(stream).connect(analyser)
      streamRef.current = stream
      contextRef.current = context
      setMicStatus('active')
      setMessage('Clique em “Preparar amostra” e depois toque o acorde uma vez.')
      const spectrum = new Uint8Array(analyser.frequencyBinCount)
      const binHz = context.sampleRate / analyser.fftSize
      const startBin = Math.ceil(65 / binHz)
      const endBin = Math.floor(700 / binHz)

      const analyze = (timestamp: number) => {
        analyser.getByteFrequencyData(spectrum)
        let sum = 0
        for (let index = startBin; index <= endBin; index += 1) sum += spectrum[index]
        const energy = (sum / (endBin - startBin + 1) / 255) * 100

        if (!armedRef.current) {
          noiseFloorRef.current = noiseFloorRef.current * 0.96 + energy * 0.04
        } else if (captureDueRef.current === 0) {
          const onset = energy - previousEnergyRef.current
          if (energy >= Math.max(4, noiseFloorRef.current + 3) && onset >= 1.3) captureDueRef.current = timestamp + 150
        } else if (timestamp >= captureDueRef.current) {
          const chord = activeChordRef.current
          const extracted = extractChordSignature(spectrum, context.sampleRate, analyser.fftSize)
          const targetShare = extracted
            ? expectedPitchClasses[chord].reduce((total, pitchClass) => total + extracted.signature[pitchClass], 0)
            : 0
          armedRef.current = false
          captureDueRef.current = 0

          if (!extracted || targetShare < 0.24) {
            setCaptureStatus('rejected')
            setMessage(`A amostra não ficou clara para ${chord}. Toque somente esse acorde e tente novamente.`)
          } else {
            const currentSamples = samplesRef.current[chord]
            if (currentSamples.length < requiredSamples) {
              const updatedChordSamples = [...currentSamples, extracted.signature]
              setSamples((current) => ({ ...current, [chord]: updatedChordSamples }))
              setCaptureStatus('captured')
              setMessage(`Amostra ${updatedChordSamples.length} de ${requiredSamples} aceita para ${chord}.`)
              setTimeout(followAction, 120)
            }
          }
        }
        previousEnergyRef.current = energy
        frameRef.current = requestAnimationFrame(analyze)
      }
      frameRef.current = requestAnimationFrame(analyze)
      followAction()
    } catch {
      setMicStatus('denied')
      setMessage('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
    }
  }

  const armCapture = () => {
    armedRef.current = true
    captureDueRef.current = 0
    setCaptureStatus('armed')
    setMessage(`Toque o acorde ${activeChord} uma vez e deixe o som vibrar.`)
  }

  const nextChord = () => {
    const nextIndex = Math.min(chordIndex + 1, calibrationChords.length - 1)
    setChordIndex(nextIndex)
    setCaptureStatus('idle')
    setMessage(`Agora vamos calibrar ${calibrationChords[nextIndex]}.`)
    followAction()
  }

  const saveProfile = () => {
    setSaving(true)
    saveChordCalibration({
      version: 1,
      userId,
      createdAt: new Date().toISOString(),
      samplesPerChord: requiredSamples,
      signatures: {
        Em: averageSignatures(samples.Em),
        G: averageSignatures(samples.G),
        C: averageSignatures(samples.C),
        D: averageSignatures(samples.D),
      },
    })
    setSaving(false)
    onSaved()
  }

  const reset = () => {
    armedRef.current = false
    captureDueRef.current = 0
    setSamples(emptySamples())
    setChordIndex(0)
    setCaptureStatus('idle')
    setMessage('Calibração reiniciada. Prepare uma nova amostra de Em.')
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#020817]/95 px-3 py-4 backdrop-blur-sm sm:grid sm:place-items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="calibration-title" className="game-shell mx-auto w-full max-w-xl rounded-[2rem] p-3 sm:p-5">
        <div className="rounded-[1.6rem] border border-white/[0.07] bg-[#09162a] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">Perfil pessoal</p><h2 id="calibration-title" className="mt-2 font-display text-3xl font-bold">Calibrar acordes</h2><p className="mt-2 text-xs leading-5 text-slate-400">Toque cinco amostras claras de cada acorde. O áudio não será gravado nem enviado.</p></div>
            <button type="button" onClick={onClose} aria-label="Fechar calibração" className="game-pill grid size-10 shrink-0 place-items-center rounded-full"><X className="size-4" /></button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {calibrationChords.map((chord, index) => <div key={chord} className={`rounded-xl border p-3 text-center ${index === chordIndex ? 'border-cyan-300/50 bg-cyan-300/10' : samples[chord].length >= requiredSamples ? 'border-emerald-300/30 bg-emerald-300/[0.08]' : 'border-white/10 bg-white/[0.025]'}`}><strong className="text-sm">{chord}</strong><span className="mt-1 block text-[9px] text-slate-500">{samples[chord].length}/{requiredSamples}</span></div>)}
          </div>

          <div className="game-card mt-5 rounded-2xl border-violet-300/20 p-5 text-center">
            <Guitar className="mx-auto size-6 text-violet-300" />
            <p className="mt-3 text-xs text-slate-400">Acorde atual</p>
            <p className="mt-1 font-display text-5xl font-bold">{activeChord}</p>
            <div className="mx-auto mt-4 flex max-w-xs gap-2">{Array.from({ length: requiredSamples }, (_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index < activeSamples.length ? 'bg-emerald-300' : 'bg-white/10'}`} />)}</div>
            <p aria-live="polite" className={`mt-4 text-xs leading-5 ${captureStatus === 'rejected' ? 'text-rose-300' : captureStatus === 'captured' ? 'text-emerald-300' : 'text-slate-400'}`}>{message}</p>
          </div>

          {micStatus !== 'active' ? (
            <button ref={actionRef} type="button" disabled={micStatus === 'requesting'} onClick={() => void enableMicrophone()} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">{micStatus === 'requesting' ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}{micStatus === 'requesting' ? 'Abrindo microfone…' : 'Ativar microfone'}</button>
          ) : chordComplete ? (
            chordIndex < calibrationChords.length - 1 ? <button ref={actionRef} type="button" onClick={nextChord} className="game-button mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold">Próximo acorde · {calibrationChords[chordIndex + 1]}</button> : <button ref={actionRef} type="button" disabled={!allComplete || saving} onClick={saveProfile} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"><Check className="size-4" /> Salvar calibração pessoal</button>
          ) : (
            <button ref={actionRef} type="button" disabled={captureStatus === 'armed'} onClick={armCapture} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60"><Mic className="size-4" />{captureStatus === 'armed' ? 'Aguardando o acorde…' : `Preparar amostra ${activeSamples.length + 1}`}</button>
          )}

          {micStatus === 'denied' && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><MicOff className="size-4" /> Libere o microfone nas configurações do navegador.</p>}
          <button type="button" onClick={reset} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-400 hover:text-white"><RotateCcw className="size-3.5" /> Reiniciar calibração</button>
        </div>
      </section>
    </div>
  )
}
