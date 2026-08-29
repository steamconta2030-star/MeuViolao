import { Check, Clock3, Heart, Mic, MicOff, Play, RotateCcw, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChordDiagram } from './ChordDiagram'
import { analyzeWithCalibration, loadChordCalibration } from '../lib/chord-calibration'

const exercises = {
  'first-chords': {
    title: 'Primeiros acordes',
    questions: [
      { prompt: 'O que significa a cifra Em?', options: ['Mi menor', 'Mi maior', 'Ré menor'], answer: 'Mi menor' },
      { prompt: 'Qual destes é um acorde maior?', options: ['Am', 'Em', 'G'], answer: 'G' },
      { prompt: 'Qual sequência pertence à primeira etapa?', options: ['Em · G · C · D', 'F#m · C# · B', 'Bb · Eb · F'], answer: 'Em · G · C · D' },
    ],
    rounds: [
      { chords: ['Em'], targetCycles: 6, title: 'Monte o Mi menor', instruction: 'Faça uma batida para baixo em cada tempo. Mantenha o Em por seis compassos.' },
      { chords: ['Em', 'G'], targetCycles: 4, title: 'Faça a primeira troca', instruction: 'Toque quatro tempos em Em e quatro em G. Complete quatro voltas.' },
      { chords: ['Em', 'G', 'C', 'D'], targetCycles: 4, title: 'Complete a sequência', instruction: 'Faça uma batida para baixo em cada tempo e complete quatro voltas em Em, G, C e D.' },
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
      { chords: ['Em', 'G'], targetCycles: 4, title: 'Troca 1', instruction: 'Alterne Em e G, com uma batida para baixo por tempo. Complete quatro voltas.' },
      { chords: ['C', 'D'], targetCycles: 4, title: 'Troca 2', instruction: 'Alterne C e D mantendo os dedos próximos das cordas. Complete quatro voltas.' },
      { chords: ['Em', 'G', 'C', 'D'], targetCycles: 4, title: 'Circuito completo', instruction: 'Mantenha cada acorde por quatro tempos e complete quatro voltas.' },
    ],
  },
  'essential-rhythm': {
    title: 'Mão direita e pulsação',
    questions: [
      { prompt: 'No começo, o que é mais importante?', options: ['Manter o pulso', 'Tocar muito rápido', 'Bater com força'], answer: 'Manter o pulso' },
      { prompt: 'Enquanto toca para baixo, como a mão deve se mover?', options: ['Relaxada e contínua', 'Travada no violão', 'O mais longe possível'], answer: 'Relaxada e contínua' },
      { prompt: 'Qual movimento vem depois da batida para baixo?', options: ['A subida da mão', 'Parar por completo', 'Trocar de acorde'], answer: 'A subida da mão' },
    ],
    rounds: [
      { chords: ['Em'], strums: ['down', 'ghost-up', 'down', 'ghost-up'], targetCycles: 6, title: 'Movimento contínuo', instruction: 'Toque nas descidas. Nas subidas, passe a mão pelo ar sem encostar nas cordas.' },
      { chords: ['Em'], strums: ['up', 'up', 'up', 'up'], targetCycles: 4, title: 'Subida isolada', instruction: 'Toque somente para cima. Entre as batidas, volte a mão para baixo sem tocar nas cordas.' },
      { chords: ['Em'], strums: ['down', 'up', 'down', 'up'], targetCycles: 6, title: 'Primeiro baixo e cima', instruction: 'Alterne devagar: baixo, cima, baixo, cima. Continue no Em para focar somente na mão direita.' },
    ],
  },
} as const

type ExerciseId = keyof typeof exercises
type PracticeChord = 'Em' | 'G' | 'C' | 'D'

const audioTimestamp = () => performance.now()

const chordPitchClasses: Record<PracticeChord, number[]> = {
  Em: [4, 7, 11], // E, G, B
  G: [7, 11, 2], // G, B, D
  C: [0, 4, 7], // C, E, G
  D: [2, 6, 9], // D, F#, A
}

const analyzeChord = (spectrum: Uint8Array, sampleRate: number, fftSize: number, chord: PracticeChord) => {
  const chroma = Array.from({ length: 12 }, () => 0)
  const binHz = sampleRate / fftSize

  for (let index = Math.ceil(65 / binHz); index <= Math.floor(520 / binHz); index += 1) {
    const magnitude = spectrum[index] / 255
    if (magnitude < 0.045) continue
    const frequency = index * binHz
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
    const pitchClass = ((midi % 12) + 12) % 12
    const lowFrequencyWeight = 1 / Math.sqrt(frequency / 80)
    chroma[pitchClass] += Math.pow(magnitude, 1.35) * lowFrequencyWeight
  }

  const total = chroma.reduce((sum, value) => sum + value, 0)
  if (total === 0) return { matched: false, confidence: 0 }

  const chordNotes = chordPitchClasses[chord]
  const targetShare = chordNotes.reduce((sum, note) => sum + chroma[note], 0) / total
  const presentNotes = chordNotes.filter((note) => chroma[note] / total >= 0.04).length
  const otherShares = (Object.keys(chordPitchClasses) as PracticeChord[])
    .filter((candidate) => candidate !== chord)
    .map((candidate) => chordPitchClasses[candidate].reduce((sum, note) => sum + chroma[note], 0) / total)
  const bestOtherShare = Math.max(...otherShares)
  const confidence = Math.max(0, Math.min(100, Math.round(((targetShare - 0.2) / 0.25) * 100)))

  return { matched: targetShare >= 0.29 && presentNotes >= 2 && targetShare >= bestOtherShare, confidence }
}

export function ChordExercise({ userId, exerciseId, onClose, onComplete }: { userId: string; exerciseId: ExerciseId; onClose: () => void; onComplete: (stars: number) => Promise<boolean> }) {
  const { title, questions, rounds: practiceRounds } = exercises[exerciseId]
  const [calibrationProfile] = useState(() => loadChordCalibration(userId))
  const [question, setQuestion] = useState(0)
  const [lives, setLives] = useState(3)
  const [wrongAnswer, setWrongAnswer] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<'quiz' | 'practice'>('quiz')
  const [round, setRound] = useState(0)
  const [running, setRunning] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [bpm, setBpm] = useState(60)
  const [beat, setBeat] = useState(0)
  const [activeChord, setActiveChord] = useState(0)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle')
  const [micLevel, setMicLevel] = useState(0)
  const [detectedBeats, setDetectedBeats] = useState(0)
  const [expectedBeats, setExpectedBeats] = useState(0)
  const [beatHit, setBeatHit] = useState(false)
  const [emStatus, setEmStatus] = useState<'idle' | 'analyzing' | 'matched' | 'uncertain'>('idle')
  const [emConfidence, setEmConfidence] = useState(0)
  const [emMatches, setEmMatches] = useState(0)
  const [analyzedChord, setAnalyzedChord] = useState<PracticeChord>('Em')
  const audioContextRef = useRef<AudioContext | null>(null)
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beatRef = useRef(0)
  const activeChordRef = useRef(0)
  const completedCyclesRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const beatStartedAtRef = useRef(0)
  const beatDetectedRef = useRef(false)
  const detectedBeatsRef = useRef(0)
  const expectedBeatsRef = useRef(0)
  const beatExpectsSoundRef = useRef(true)
  const noiseFloorRef = useRef(1.5)
  const previousGuitarEnergyRef = useRef(0)
  const bpmRef = useRef(60)
  const roundRef = useRef(0)
  const emMatchesRef = useRef(0)
  const chordAnalysisDueRef = useRef(0)
  const chordAnalysisTargetRef = useRef<PracticeChord>('Em')
  const chordCardRefs = useRef<Array<HTMLDivElement | null>>([])
  const exerciseScrollRef = useRef<HTMLDivElement | null>(null)
  const questionRef = useRef<HTMLHeadingElement | null>(null)
  const practiceCardRef = useRef<HTMLDivElement | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)

  const focusPractice = () => {
    requestAnimationFrame(() => {
      practiceCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    })
  }

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

    if (nextBeat === 1 && previousBeat !== 0) {
      const nextChord = (activeChordRef.current + 1) % practiceRounds[round].chords.length
      activeChordRef.current = nextChord
      setActiveChord(nextChord)

      if (nextChord === 0) {
        const nextCycle = completedCyclesRef.current + 1
        completedCyclesRef.current = nextCycle
        setCompletedCycles(nextCycle)
        if (nextCycle >= practiceRounds[round].targetCycles) {
          if (metronomeRef.current) {
            clearInterval(metronomeRef.current)
            metronomeRef.current = null
          }
          runningRef.current = false
          setRunning(false)
          setBeat(4)
          return
        }
      }
    }

    beatRef.current = nextBeat
    beatStartedAtRef.current = audioTimestamp()
    beatDetectedRef.current = false
    const currentRound = practiceRounds[roundRef.current]
    const currentPattern = 'strums' in currentRound ? currentRound.strums : ['down', 'down', 'down', 'down']
    beatExpectsSoundRef.current = currentPattern[nextBeat - 1] !== 'ghost-up'
    if (beatExpectsSoundRef.current) {
      expectedBeatsRef.current += 1
      setExpectedBeats(expectedBeatsRef.current)
    }
    setBeatHit(false)
    setEmStatus('idle')
    setBeat(nextBeat)
    playClick(nextBeat === 1)
  }

  const beginRound = () => {
    setCountdown(null)
    countdownTimerRef.current = null
    runningRef.current = true
    setRunning(true)
    pulse()
    metronomeRef.current = setInterval(pulse, 60000 / bpm)
  }

  const runCountdown = (value: number) => {
    setCountdown(value)
    playClick(true)
    countdownTimerRef.current = setTimeout(() => {
      if (value > 1) runCountdown(value - 1)
      else beginRound()
    }, 1000)
  }

  const startRound = async () => {
    if (running || countdownTimerRef.current) return
    if (!audioContextRef.current) audioContextRef.current = new AudioContext()
    await audioContextRef.current.resume()
    beatRef.current = 0
    activeChordRef.current = 0
    completedCyclesRef.current = 0
    detectedBeatsRef.current = 0
    expectedBeatsRef.current = 0
    runningRef.current = false
    setBeat(0)
    setActiveChord(0)
    setCompletedCycles(0)
    setDetectedBeats(0)
    setExpectedBeats(0)
    setBeatHit(false)
    setEmStatus('idle')
    setEmConfidence(0)
    setEmMatches(0)
    emMatchesRef.current = 0
    chordAnalysisDueRef.current = 0
    setRunning(false)
    runCountdown(3)
    focusPractice()
  }

  const enableMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unsupported')
      return
    }

    setMicStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      })
      if (!audioContextRef.current) audioContextRef.current = new AudioContext()
      await audioContextRef.current.resume()

      mediaStreamRef.current = stream
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 8192
      analyser.smoothingTimeConstant = 0.35
      audioContextRef.current.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const spectrum = new Uint8Array(analyser.frequencyBinCount)
      const binHz = audioContextRef.current.sampleRate / analyser.fftSize
      const guitarBandStart = Math.ceil(80 / binHz)
      const guitarBandEnd = Math.floor(650 / binHz)

      const updateMeter = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }
        const rms = Math.sqrt(sum / samples.length)
        const level = Math.min(100, Math.round(rms * 420))
        setMicLevel(level)
        analyser.getByteFrequencyData(spectrum)
        let guitarBandSum = 0
        for (let index = guitarBandStart; index <= guitarBandEnd; index += 1) {
          guitarBandSum += spectrum[index]
        }
        const guitarEnergy = (guitarBandSum / (guitarBandEnd - guitarBandStart + 1) / 255) * 100
        const now = audioTimestamp()

        if (chordAnalysisDueRef.current > 0 && now >= chordAnalysisDueRef.current) {
          chordAnalysisDueRef.current = 0
          const result = calibrationProfile
            ? analyzeWithCalibration(spectrum, audioContextRef.current!.sampleRate, analyser.fftSize, chordAnalysisTargetRef.current, calibrationProfile)
            : analyzeChord(spectrum, audioContextRef.current!.sampleRate, analyser.fftSize, chordAnalysisTargetRef.current)
          setEmConfidence(result.confidence)
          setEmStatus(result.matched ? 'matched' : 'uncertain')
          if (result.matched) {
            emMatchesRef.current += 1
            setEmMatches(emMatchesRef.current)
          }
        }

        if (!runningRef.current) {
          noiseFloorRef.current = noiseFloorRef.current * 0.96 + guitarEnergy * 0.04
        } else if (beatExpectsSoundRef.current && !beatDetectedRef.current) {
          const elapsed = audioTimestamp() - beatStartedAtRef.current
          const detectionWindow = Math.min(800, (60000 / bpmRef.current) * 0.75)
          const threshold = Math.max(3.5, noiseFloorRef.current + 3)
          const onset = guitarEnergy - previousGuitarEnergyRef.current
          if (elapsed >= 45 && elapsed <= detectionWindow && guitarEnergy >= threshold && onset >= 1.5) {
            beatDetectedRef.current = true
            detectedBeatsRef.current += 1
            setDetectedBeats(detectedBeatsRef.current)
            setBeatHit(true)
            const targetChord = practiceRounds[roundRef.current].chords[activeChordRef.current] as PracticeChord
            chordAnalysisTargetRef.current = targetChord
            setAnalyzedChord(targetChord)
            setEmStatus('analyzing')
            chordAnalysisDueRef.current = audioTimestamp() + 140
          }
        }
        previousGuitarEnergyRef.current = guitarEnergy
        meterFrameRef.current = requestAnimationFrame(updateMeter)
      }

      setMicStatus('active')
      updateMeter()
    } catch {
      setMicStatus('denied')
    }
  }

  useEffect(() => {
    if (!running && metronomeRef.current) {
      clearInterval(metronomeRef.current)
      metronomeRef.current = null
    }
  }, [running])

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  useEffect(() => {
    roundRef.current = round
  }, [round])

  useEffect(() => {
    chordCardRefs.current[activeChord]?.scrollIntoView({
      behavior: running ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeChord, running])

  useEffect(() => {
    requestAnimationFrame(() => {
      exerciseScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [question])

  useEffect(() => {
    if (!finished && !failed) return
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [failed, finished])

  useEffect(() => () => {
    if (metronomeRef.current) clearInterval(metronomeRef.current)
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
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
    setRunning(false)
    setCountdown(null)
    setBeat(0)
    setActiveChord(0)
    setCompletedCycles(0)
    setDetectedBeats(0)
    setExpectedBeats(0)
    setBeatHit(false)
    setEmStatus('idle')
    setEmConfidence(0)
    setEmMatches(0)
    beatRef.current = 0
    activeChordRef.current = 0
    completedCyclesRef.current = 0
    detectedBeatsRef.current = 0
    expectedBeatsRef.current = 0
    runningRef.current = false
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    emMatchesRef.current = 0
    chordAnalysisDueRef.current = 0
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
    focusPractice()
  }

  const finishRound = async () => {
    if (completedCycles < practiceRounds[round].targetCycles || saving) return
    if (round < practiceRounds.length - 1) {
      setRound((current) => current + 1)
      setBeat(0)
      setActiveChord(0)
      setCompletedCycles(0)
      setDetectedBeats(0)
      setExpectedBeats(0)
      setBeatHit(false)
      setEmStatus('idle')
      setEmConfidence(0)
      setEmMatches(0)
      beatRef.current = 0
      activeChordRef.current = 0
      completedCyclesRef.current = 0
      detectedBeatsRef.current = 0
      expectedBeatsRef.current = 0
      emMatchesRef.current = 0
      chordAnalysisDueRef.current = 0
      focusPractice()
      return
    }

    setSaving(true)
    const saved = await onComplete(lives)
    if (saved) setFinished(true)
    setSaving(false)
  }

  const activePracticeRound = practiceRounds[round]
  const strumPattern = 'strums' in activePracticeRound
    ? activePracticeRound.strums
    : ['down', 'down', 'down', 'down'] as const
  const activeStrum = strumPattern[Math.max(0, beat - 1)] ?? 'down'
  const rhythmAccuracy = expectedBeats > 0 ? Math.min(100, Math.round((detectedBeats / expectedBeats) * 100)) : 0
  const chordAccuracy = detectedBeats > 0 ? Math.min(100, Math.round((emMatches / detectedBeats) * 100)) : 0
  const roundFeedback = micStatus !== 'active'
    ? 'Rodada concluída pelo tempo. Ative o microfone na próxima para receber análise de ritmo e acordes.'
    : detectedBeats === 0
      ? 'A rodada terminou, mas nenhuma batida clara foi percebida. Aproxime o celular e toque com um ataque firme e confortável.'
      : rhythmAccuracy >= 75 && chordAccuracy >= 70
        ? 'Muito bom: o pulso ficou presente e os acordes combinaram com seu perfil pessoal.'
        : rhythmAccuracy < 55
          ? 'Priorize o pulso: toque uma vez em cada círculo aceso, mesmo que precise reduzir a velocidade.'
          : chordAccuracy < 55
            ? 'O ritmo apareceu. Agora mantenha os dedos firmes e deixe todas as cordas do acorde soarem com clareza.'
            : 'Boa evolução. Repita com calma para deixar ritmo e acordes mais consistentes.'

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#030815]/85 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={`Exercício ${title}`}>
      <div ref={exerciseScrollRef} className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-cyan-300/20 bg-[#0a1528] p-4 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:p-7">
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
            <h3 ref={questionRef} className="mt-7 scroll-mt-4 font-display text-2xl font-semibold">{questions[question].prompt}</h3>
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
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Rodada {round + 1} de {practiceRounds.length}</span><span className="flex items-center gap-1 text-rose-300"><Heart className="size-4 fill-current" /> {lives}</span></div>
            <div className="mt-3 flex gap-1">{practiceRounds.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= round ? 'bg-violet-300' : 'bg-white/10'}`} />)}</div>

            <div ref={practiceCardRef} className="mt-4 scroll-mt-2 rounded-3xl border border-violet-400/20 bg-violet-400/[0.07] p-3 text-center sm:mt-7 sm:p-6">
              <p className="mb-3 text-[10px] text-slate-400"><strong className="text-slate-200">1</strong> indicador · <strong className="text-slate-200">2</strong> médio · <strong className="text-slate-200">3</strong> anelar · <strong className="text-slate-200">4</strong> mínimo</p>
              <div className="flex snap-x flex-nowrap justify-start gap-2 overflow-x-auto pb-2 sm:justify-center">
                {practiceRounds[round].chords.map((chord, index) => (
                  <div key={chord} ref={(element) => { chordCardRefs.current[index] = element }} className="shrink-0 snap-center">
                    <ChordDiagram chord={chord} active={index === activeChord} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-2" aria-label={beat ? `Tempo ${beat} de 4` : 'Contagem aguardando início'}>
                {[1, 2, 3, 4].map((count) => {
                  const confirmed = beat === count && beatHit
                  const direction = strumPattern[count - 1] ?? 'down'
                  const ghost = direction === 'ghost-up'
                  return <span key={count} className={`grid size-10 place-items-center rounded-full border text-xs font-bold transition ${confirmed ? 'scale-110 border-emerald-200 bg-emerald-300 text-[#07101f]' : beat === count ? `scale-110 ${ghost ? 'border-dashed border-violet-200 bg-violet-300/15 text-violet-100' : 'border-cyan-200 bg-cyan-300 text-[#07101f]'}` : ghost ? 'border-dashed border-violet-300/30 bg-violet-300/[0.04] text-violet-300/60' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>{confirmed ? <Check className="size-4" /> : <span><strong className="block text-sm leading-3">{direction === 'down' ? '↓' : '↑'}</strong><small className="text-[8px]">{ghost ? 'sem som' : count}</small></span>}</span>
                })}
              </div>
              {countdown !== null && <div className="mx-auto mt-3 grid size-16 animate-pulse place-items-center rounded-full border-2 border-amber-200/60 bg-amber-300/15 font-display text-4xl font-bold text-amber-200" aria-live="assertive">{countdown}</div>}
              <p className={`mt-3 text-xs font-semibold ${activeStrum === 'ghost-up' ? 'text-violet-200' : 'text-cyan-200'}`}>{activeStrum === 'ghost-up' ? '↑ Suba a mão sem tocar nas cordas' : activeStrum === 'up' ? '↑ Agora, toque para cima' : '↓ Agora, toque para baixo'}</p>
              {micStatus === 'active' && expectedBeats > 0 && <p className="mt-2 text-[11px] text-emerald-200">Microfone percebeu {detectedBeats} de {expectedBeats} batidas até agora</p>}
              {micStatus === 'active' && (
                <div className={`mx-auto mt-2 max-w-xs rounded-xl border px-3 py-2 text-xs ${emStatus === 'matched' ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : emStatus === 'uncertain' ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-white/[0.025] text-slate-400'}`}>
                  {emStatus === 'matched' ? `✓ ${analyzedChord} reconhecido · compatibilidade ${emConfidence}%` : emStatus === 'uncertain' ? `Som captado, mas o ${analyzedChord} ainda está incerto · ${emConfidence}%` : emStatus === 'analyzing' ? `Analisando as notas do ${analyzedChord}…` : `Toque o acorde destacado: ${practiceRounds[round].chords[activeChord]}`}
                  {detectedBeats > 0 && <small className="mt-1 block opacity-75">{emMatches} de {detectedBeats} batidas combinaram com o acorde pedido</small>}
                  {calibrationProfile && <small className="mt-1 block text-violet-200/75">Perfil pessoal de acordes ativo</small>}
                </div>
              )}
              <h3 className="mt-4 text-lg font-semibold">{practiceRounds[round].title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{practiceRounds[round].instruction}</p>
              <div className={`mx-auto mt-4 grid size-20 place-items-center rounded-full border-4 font-display font-semibold sm:mt-6 sm:size-24 ${completedCycles >= practiceRounds[round].targetCycles ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-300' : 'border-cyan-300/30 bg-cyan-300/[0.06] text-cyan-200'}`}>
                {completedCycles >= practiceRounds[round].targetCycles ? <Check className="size-9" /> : <span><strong className="text-3xl">{completedCycles}</strong><small className="block font-sans text-[10px]">de {practiceRounds[round].targetCycles} voltas</small></span>}
              </div>
              {completedCycles >= practiceRounds[round].targetCycles && (
                <div aria-live="polite" className="mt-4 rounded-2xl border border-emerald-300/20 bg-[#071426] p-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Resumo da rodada</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <span className="text-[10px] text-slate-500">Ritmo captado</span>
                      <strong className="mt-1 block text-xl text-cyan-200">{micStatus === 'active' ? `${rhythmAccuracy}%` : '—'}</strong>
                      <small className="text-[10px] text-slate-500">{detectedBeats}/{expectedBeats} batidas</small>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <span className="text-[10px] text-slate-500">Acordes reconhecidos</span>
                      <strong className="mt-1 block text-xl text-violet-200">{micStatus === 'active' && detectedBeats > 0 ? `${chordAccuracy}%` : '—'}</strong>
                      <small className="text-[10px] text-slate-500">{emMatches}/{detectedBeats} compatíveis</small>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-300">{roundFeedback}</p>
                  <small className="mt-2 block text-[10px] leading-4 text-slate-500">Este retorno é orientativo e não impede seu avanço.</small>
                  <button type="button" disabled={saving} onClick={() => void finishRound()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#07101f] shadow-lg shadow-emerald-950/30 disabled:opacity-50">
                    <Check className="size-4" /> {round === practiceRounds.length - 1 ? 'Concluir exercício' : 'Próxima rodada'}
                  </button>
                </div>
              )}
            </div>

            {completedCycles < practiceRounds[round].targetCycles ? (
              <>
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5 sm:mt-4 sm:p-3">
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
                <div className="mt-2.5 flex items-center justify-center gap-2 sm:mt-4">
                  <span className="mr-1 text-xs text-slate-500">Velocidade</span>
                  {[40, 60, 80].map((value) => <button key={value} type="button" disabled={running || countdown !== null} onClick={() => setBpm(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${bpm === value ? 'border-violet-300/50 bg-violet-300/15 text-violet-200' : 'border-white/10 text-slate-400'} disabled:opacity-50`}>{value} BPM</button>)}
                </div>
                <button type="button" disabled={running || countdown !== null} onClick={() => void startRound()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07101f] disabled:bg-cyan-300/40">
                  {countdown !== null ? <><Clock3 className="size-4" /> Prepare-se · {countdown}</> : running ? <><Clock3 className="size-4" /> Volta {Math.min(completedCycles + 1, practiceRounds[round].targetCycles)} de {practiceRounds[round].targetCycles} · {bpm} BPM</> : <><Play className="size-4" /> Iniciar treino de {practiceRounds[round].targetCycles} voltas</>}
                </button>
              </>
            ) : null}
            {saving && <p className="mt-3 text-center text-xs text-cyan-300">Salvando sua prática…</p>}
          </div>
        )}

        {failed && (
          <div ref={resultRef} className="py-10 text-center"><Heart className="mx-auto size-10 text-rose-300" /><h3 className="mt-4 font-display text-3xl font-semibold">Quase lá!</h3><p className="mt-2 text-sm text-slate-400">Revise as cifras e tente novamente.</p><button type="button" onClick={restart} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#07101f]"><RotateCcw className="size-4" /> Tentar novamente</button></div>
        )}

        {finished && (
          <div ref={resultRef} className="py-10 text-center"><div className="flex justify-center gap-2">{[1, 2, 3].map((star) => <Star key={star} className={`size-9 ${star <= lives ? 'fill-amber-300 text-amber-300' : 'text-white/10'}`} />)}</div><h3 className="mt-5 font-display text-3xl font-semibold">Exercício concluído!</h3><p className="mt-2 text-sm text-slate-400">5 minutos de prática e XP foram registrados.</p><button type="button" onClick={onClose} className="mt-6 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-[#07101f]">Voltar ao painel</button></div>
        )}
      </div>
    </div>
  )
}
