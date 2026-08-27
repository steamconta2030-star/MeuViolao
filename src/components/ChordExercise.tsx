import { Check, Clock3, Heart, Mic, MicOff, Play, RotateCcw, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChordDiagram } from './ChordDiagram'

const exercises = {
  'first-chords': {
    title: 'Primeiros acordes',
    questions: [
      { prompt: 'O que significa a cifra Em?', options: ['Mi menor', 'Mi maior', 'Ré menor'], answer: 'Mi menor' },
      { prompt: 'Qual destes é um acorde maior?', options: ['Am', 'Em', 'G'], answer: 'G' },
      { prompt: 'Qual sequência pertence à primeira etapa?', options: ['Em · G · C · D', 'F#m · C# · B', 'Bb · Eb · F'], answer: 'Em · G · C · D' },
    ],
    rounds: [
      { chords: ['Em'], title: 'Monte o Mi menor', instruction: 'Forme o acorde Em e toque quatro batidas lentas.' },
      { chords: ['Em', 'G'], title: 'Faça a primeira troca', instruction: 'Alterne entre Em e G sem parar o movimento.' },
      { chords: ['Em', 'G', 'C', 'D'], title: 'Complete a sequência', instruction: 'Toque a sequência inteira duas vezes.' },
    ],
  },
  'clean-changes': {
    title: 'Trocas limpas',
    questions: [
      { prompt: 'O que deve continuar constante durante a troca?', options: ['O ritmo', 'A força da mão', 'O volume'], answer: 'O ritmo' },
      { prompt: 'Se a troca ainda falha, qual é a melhor decisão?', options: ['Tocar mais forte', 'Diminuir a velocidade', 'Pular o acorde'], answer: 'Diminuir a velocidade' },
      { prompt: 'Qual movimento ajuda a troca ficar limpa?', options: ['Levantar os dedos o mínimo possível', 'Afastar toda a mão', 'Parar por vários segundos'], answer: 'Levantar os dedos o mínimo possível' },
    ],
    rounds: [
      { chords: ['Em', 'G'], title: 'Troca 1', instruction: 'Alterne Em e G devagar, sem interromper a contagem.' },
      { chords: ['C', 'D'], title: 'Troca 2', instruction: 'Alterne C e D mantendo os dedos próximos das cordas.' },
      { chords: ['Em', 'G', 'C', 'D'], title: 'Circuito completo', instruction: 'Faça a sequência completa e mantenha cada acorde por quatro tempos.' },
    ],
  },
} as const

type ExerciseId = keyof typeof exercises

export function ChordExercise({ exerciseId, onClose, onComplete }: { exerciseId: ExerciseId; onClose: () => void; onComplete: (stars: number) => Promise<boolean> }) {
  const { title, questions, rounds: practiceRounds } = exercises[exerciseId]
  const [question, setQuestion] = useState(0)
  const [lives, setLives] = useState(3)
  const [wrongAnswer, setWrongAnswer] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<'quiz' | 'practice'>('quiz')
  const [round, setRound] = useState(0)
  const [seconds, setSeconds] = useState(20)
  const [running, setRunning] = useState(false)
  const [bpm, setBpm] = useState(60)
  const [beat, setBeat] = useState(0)
  const [activeChord, setActiveChord] = useState(0)
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle')
  const [micLevel, setMicLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const beatRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const meterFrameRef = useRef<number | null>(null)

  const playClick = (accent: boolean) => {
    const context = audioContextRef.current
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = accent ? 1100 : 760
    gain.gain.setValueAtTime(accent ? 0.12 : 0.07, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.06)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.07)
  }

  const pulse = () => {
    const previousBeat = beatRef.current
    const nextBeat = (beatRef.current % 4) + 1
    beatRef.current = nextBeat
    setBeat(nextBeat)
    playClick(nextBeat === 1)
    if (nextBeat === 1 && previousBeat !== 0) {
      setActiveChord((current) => (current + 1) % practiceRounds[round].chords.length)
    }
  }

  const startRound = async () => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext()
    await audioContextRef.current.resume()
    beatRef.current = 0
    setBeat(0)
    setActiveChord(0)
    setRunning(true)
    pulse()
    metronomeRef.current = setInterval(pulse, 60000 / bpm)
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
      if (!audioContextRef.current) audioContextRef.current = new AudioContext()
      await audioContextRef.current.resume()

      mediaStreamRef.current = stream
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.75
      audioContextRef.current.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)

      const updateMeter = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }
        const rms = Math.sqrt(sum / samples.length)
        setMicLevel(Math.min(100, Math.round(rms * 420)))
        meterFrameRef.current = requestAnimationFrame(updateMeter)
      }

      setMicStatus('active')
      updateMeter()
    } catch {
      setMicStatus('denied')
    }
  }

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (!running && metronomeRef.current) {
      clearInterval(metronomeRef.current)
      metronomeRef.current = null
    }
  }, [running])

  useEffect(() => () => {
    if (metronomeRef.current) clearInterval(metronomeRef.current)
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current)
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    void audioContextRef.current?.close()
  }, [])

  const restart = () => {
    setQuestion(0)
    setLives(3)
    setWrongAnswer(null)
    setFailed(false)
    setPhase('quiz')
    setRound(0)
    setSeconds(20)
    setRunning(false)
    setBeat(0)
    setActiveChord(0)
  }

  const answer = async (option: string) => {
    if (saving || finished || failed) return
    if (option !== questions[question].answer) {
      const nextLives = lives - 1
      setLives(nextLives)
      setWrongAnswer(option)
      if (nextLives === 0) setFailed(true)
      return
    }

    setWrongAnswer(null)
    if (question < questions.length - 1) {
      setQuestion((current) => current + 1)
      return
    }

    setPhase('practice')
  }

  const finishRound = async () => {
    if (seconds > 0 || saving) return
    if (round < practiceRounds.length - 1) {
      setRound((current) => current + 1)
      setSeconds(20)
      setBeat(0)
      setActiveChord(0)
      return
    }

    setSaving(true)
    const saved = await onComplete(lives)
    if (saved) setFinished(true)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#030815]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Exercício ${title}`}>
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-300/20 bg-[#0a1528] p-5 shadow-2xl shadow-black/60 sm:p-7">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">{title}</p><p className="mt-1 text-xs text-slate-500">{phase === 'quiz' ? 'Parte 1 · Perguntas' : 'Parte 2 · Prática no violão'}</p></div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white" aria-label="Fechar"><X className="size-4" /></button>
        </div>

        {!finished && !failed && phase === 'quiz' && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1">{questions.map((_, index) => <span key={index} className={`h-1.5 w-12 rounded-full ${index <= question ? 'bg-cyan-300' : 'bg-white/10'}`} />)}</div>
              <div className="flex items-center gap-1 text-xs text-rose-300"><Heart className="size-4 fill-current" /> {lives}</div>
            </div>
            <h3 className="mt-7 font-display text-2xl font-semibold">{questions[question].prompt}</h3>
            <div className="mt-6 grid gap-3">
              {questions[question].options.map((option) => (
                <button key={option} type="button" disabled={saving} onClick={() => void answer(option)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${wrongAnswer === option ? 'border-rose-400/50 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/[0.035] hover:border-cyan-300/40 hover:bg-cyan-300/[0.07]'}`}>{option}</button>
              ))}
            </div>
            {wrongAnswer && <p className="mt-4 text-xs text-rose-300">Ainda não. Tente outra opção.</p>}
            {saving && <p className="mt-4 text-xs text-cyan-300">Salvando sua conquista…</p>}
          </>
        )}

        {!finished && !failed && phase === 'practice' && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Rodada {round + 1} de {practiceRounds.length}</span><span className="flex items-center gap-1 text-rose-300"><Heart className="size-4 fill-current" /> {lives}</span></div>
            <div className="mt-3 flex gap-1">{practiceRounds.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= round ? 'bg-violet-300' : 'bg-white/10'}`} />)}</div>

            <div className="mt-7 rounded-3xl border border-violet-400/20 bg-violet-400/[0.07] p-6 text-center">
              <p className="mb-3 text-[10px] text-slate-400"><strong className="text-slate-200">1</strong> indicador · <strong className="text-slate-200">2</strong> médio · <strong className="text-slate-200">3</strong> anelar · <strong className="text-slate-200">4</strong> mínimo</p>
              <div className="flex flex-wrap justify-center gap-2">
                {practiceRounds[round].chords.map((chord, index) => <ChordDiagram key={chord} chord={chord} active={index === activeChord} />)}
              </div>
              <div className="mt-4 flex justify-center gap-2" aria-label={beat ? `Tempo ${beat} de 4` : 'Contagem aguardando início'}>
                {[1, 2, 3, 4].map((count) => <span key={count} className={`grid size-8 place-items-center rounded-full border text-xs font-bold transition ${beat === count ? 'scale-110 border-cyan-200 bg-cyan-300 text-[#07101f]' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>{count}</span>)}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{practiceRounds[round].title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{practiceRounds[round].instruction}</p>
              <div className={`mx-auto mt-6 grid size-24 place-items-center rounded-full border-4 font-display text-3xl font-semibold ${seconds === 0 ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-300' : 'border-cyan-300/30 bg-cyan-300/[0.06] text-cyan-200'}`}>
                {seconds === 0 ? <Check className="size-9" /> : seconds}
              </div>
            </div>

            {seconds > 0 ? (
              <>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {micStatus === 'active' ? <Mic className="size-4 shrink-0 text-emerald-300" /> : <MicOff className="size-4 shrink-0 text-slate-500" />}
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold">{micStatus === 'active' ? 'Microfone captando' : 'Captação do violão'}</p>
                        <p className="text-[10px] text-slate-500">{micStatus === 'active' ? 'Toque as cordas e observe o nível.' : 'Ative para testar o som do aparelho.'}</p>
                      </div>
                    </div>
                    {micStatus !== 'active' && <button type="button" disabled={micStatus === 'requesting'} onClick={() => void enableMicrophone()} className="shrink-0 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">{micStatus === 'requesting' ? 'Aguardando…' : 'Ativar'}</button>}
                  </div>
                  {micStatus === 'active' && <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 transition-[width] duration-75" style={{ width: `${micLevel}%` }} /></div>}
                  {micStatus === 'denied' && <p className="mt-2 text-left text-[10px] text-rose-300">Permissão negada. Libere o microfone nas configurações do navegador e tente novamente.</p>}
                  {micStatus === 'unsupported' && <p className="mt-2 text-left text-[10px] text-amber-300">Este navegador não disponibilizou acesso ao microfone.</p>}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="mr-1 text-xs text-slate-500">Velocidade</span>
                  {[40, 60, 80].map((value) => <button key={value} type="button" disabled={running} onClick={() => setBpm(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${bpm === value ? 'border-violet-300/50 bg-violet-300/15 text-violet-200' : 'border-white/10 text-slate-400'} disabled:opacity-50`}>{value} BPM</button>)}
                </div>
                <button type="button" disabled={running} onClick={() => void startRound()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07101f] disabled:bg-cyan-300/40">
                  {running ? <><Clock3 className="size-4" /> Toque por {seconds}s · {bpm} BPM</> : <><Play className="size-4" /> Iniciar rodada de 20s</>}
                </button>
              </>
            ) : (
              <button type="button" disabled={saving} onClick={() => void finishRound()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#07101f] disabled:opacity-50">
                <Check className="size-4" /> {round === practiceRounds.length - 1 ? 'Concluir exercício' : 'Próxima rodada'}
              </button>
            )}
            {saving && <p className="mt-3 text-center text-xs text-cyan-300">Salvando sua prática…</p>}
          </div>
        )}

        {failed && (
          <div className="py-10 text-center"><Heart className="mx-auto size-10 text-rose-300" /><h3 className="mt-4 font-display text-3xl font-semibold">Quase lá!</h3><p className="mt-2 text-sm text-slate-400">Revise as cifras e tente novamente.</p><button type="button" onClick={restart} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#07101f]"><RotateCcw className="size-4" /> Tentar novamente</button></div>
        )}

        {finished && (
          <div className="py-10 text-center"><div className="flex justify-center gap-2">{[1, 2, 3].map((star) => <Star key={star} className={`size-9 ${star <= lives ? 'fill-amber-300 text-amber-300' : 'text-white/10'}`} />)}</div><h3 className="mt-5 font-display text-3xl font-semibold">Exercício concluído!</h3><p className="mt-2 text-sm text-slate-400">5 minutos de prática e XP foram registrados.</p><button type="button" onClick={onClose} className="mt-6 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-[#07101f]">Voltar ao painel</button></div>
        )}
      </div>
    </div>
  )
}
