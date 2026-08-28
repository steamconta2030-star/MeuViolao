import { Check, Guitar, LoaderCircle, Mic, MicOff, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { calibrationChords, compareWithCalibration, loadChordCalibration, saveChordDiagnostic, type CalibrationChord } from '../lib/chord-calibration'

const attemptsPerChord = 3

type DiagnosticResult = {
  requested: CalibrationChord
  identified: CalibrationChord
  confidence: number
  scores: Record<CalibrationChord, number>
}

export function ChordDiagnostic({ userId, onClose, onRecalibrate }: { userId: string; onClose: () => void; onRecalibrate: () => void }) {
  const [profile] = useState(() => loadChordCalibration(userId))
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle')
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'armed' | 'analyzing'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [message, setMessage] = useState('Ative o microfone para iniciar o diagnóstico.')
  const [lastOutcome, setLastOutcome] = useState<'idle' | 'correct' | 'wrong' | 'rejected'>('idle')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const frameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const armedRef = useRef(false)
  const captureDueRef = useRef(0)
  const listenAfterRef = useRef(0)
  const analysisSamplesRef = useRef<ReturnType<typeof compareWithCalibration>[]>([])
  const analysisFramesRef = useRef(0)
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noiseFloorRef = useRef(2)
  const previousEnergyRef = useRef(0)
  const requestedChordRef = useRef<CalibrationChord>('Em')
  const actionRef = useRef<HTMLButtonElement | null>(null)
  const savedDiagnosticRef = useRef(false)

  const completed = results.length >= calibrationChords.length * attemptsPerChord
  const requestedChord = calibrationChords[Math.min(calibrationChords.length - 1, Math.floor(results.length / attemptsPerChord))]
  const chordAttempt = (results.length % attemptsPerChord) + 1
  const correctResults = results.filter((result) => result.requested === result.identified).length

  useEffect(() => {
    requestedChordRef.current = requestedChord
  }, [requestedChord])

  useEffect(() => {
    if (!completed || savedDiagnosticRef.current) return
    savedDiagnosticRef.current = true
    setSyncStatus('saving')
    void saveChordDiagnostic(userId, results, correctResults).then((synced) => setSyncStatus(synced ? 'saved' : 'local'))
  }, [completed, correctResults, results, userId])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    void contextRef.current?.close()
  }, [])

  const followAction = () => requestAnimationFrame(() => actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))

  const enableMicrophone = async () => {
    if (!profile) return
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
      setMessage('Prepare a primeira batida única para baixo em Em.')

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
        } else if (timestamp < listenAfterRef.current) {
          previousEnergyRef.current = energy
        } else if (captureDueRef.current === 0) {
          const onset = energy - previousEnergyRef.current
          if (energy >= Math.max(6, noiseFloorRef.current + 5) && onset >= 2.2) {
            captureDueRef.current = timestamp + 150
            analysisSamplesRef.current = []
            analysisFramesRef.current = 0
            setCaptureStatus('analyzing')
            setMessage('Ataque detectado. Verificando o som sustentado…')
          }
        } else if (timestamp >= captureDueRef.current) {
          const requested = requestedChordRef.current
          const comparison = compareWithCalibration(spectrum, context.sampleRate, analyser.fftSize, profile)
          analysisFramesRef.current += 1
          if (comparison) analysisSamplesRef.current.push(comparison)
          if (analysisFramesRef.current < 5) {
            captureDueRef.current = timestamp + 75
          } else {
            const captured = analysisSamplesRef.current
            armedRef.current = false
            captureDueRef.current = 0
            setCaptureStatus('idle')
            const votes = calibrationChords.map((chord) => ({ chord, count: captured.filter((item) => item?.identified === chord).length }))
            let winner = votes[0]
            for (let index = 1; index < votes.length; index += 1) if (votes[index].count > winner.count) winner = votes[index]
            const winnerSamples = captured.filter((item) => item?.identified === winner.chord)
            const averageConfidence = winnerSamples.length ? Math.round(winnerSamples.reduce((sum, item) => sum + (item?.confidence ?? 0), 0) / winnerSamples.length) : 0
            const averageScores = Object.fromEntries(calibrationChords.map((chord) => [chord, Math.round(captured.reduce((sum, item) => sum + (item?.scores.find((score) => score.chord === chord)?.confidence ?? 0), 0) / Math.max(1, captured.length))])) as Record<CalibrationChord, number>
            const orderedScores = Object.values(averageScores).toSorted((left, right) => right - left)
            const requiredVotes = Math.max(2, Math.ceil(captured.length * 0.6))
            const stable = captured.length >= 2 && winner.count >= requiredVotes && averageConfidence >= 68 && orderedScores[0] - orderedScores[1] >= 1

            if (!stable) {
              const reason = captured.length < 2
                ? 'o som terminou rápido demais'
                : winner.count < requiredVotes
                  ? 'as leituras não apontaram para o mesmo acorde'
                  : averageConfidence < 68
                    ? 'o som ficou pouco parecido com a calibração'
                    : 'dois acordes ficaram parecidos demais'
              setMessage(`Som rejeitado: ${reason}. Toque novamente e deixe as cordas soarem; esta tentativa não foi contada.`)
              setLastOutcome('rejected')
            } else {
              setResults((current) => [...current, { requested, identified: winner.chord, confidence: averageConfidence, scores: averageScores }])
              const correct = winner.chord === requested
              setLastOutcome(correct ? 'correct' : 'wrong')
              setMessage(correct ? `Acerto — ${requested} reconhecido.` : `Acorde diferente — esperado ${requested}, identificado ${winner.chord}. Este teste foi registrado como erro.`)
            }
            requestAnimationFrame(followAction)
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
    armedRef.current = false
    captureDueRef.current = 0
    analysisSamplesRef.current = []
    analysisFramesRef.current = 0
    setCaptureStatus('armed')
    setLastOutcome('idle')
    setSyncStatus('idle')
    savedDiagnosticRef.current = false
    setCountdown(3)
    setMessage(`Prepare o acorde ${requestedChord}. Toque somente depois da contagem.`)

    const tick = (value: number) => {
      if (value > 0) {
        setCountdown(value)
        countdownTimerRef.current = setTimeout(() => tick(value - 1), 700)
        return
      }
      setCountdown(null)
      armedRef.current = true
      listenAfterRef.current = performance.now() + 250
      previousEnergyRef.current = noiseFloorRef.current
      setMessage(`Toque agora: uma batida única para baixo em ${requestedChord}.`)
    }
    tick(3)
  }

  const restart = () => {
    armedRef.current = false
    captureDueRef.current = 0
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    setCountdown(null)
    setResults([])
    setCaptureStatus('idle')
    setLastOutcome('idle')
    setMessage('Diagnóstico reiniciado. Prepare o acorde Em.')
    followAction()
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-[#020817]/95 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="diagnostic-title" className="game-shell w-full max-w-md rounded-[2rem] p-5 text-center">
          <Guitar className="mx-auto size-8 text-violet-300" /><h2 id="diagnostic-title" className="mt-4 font-display text-3xl font-bold">Calibre primeiro</h2><p className="mt-3 text-sm leading-6 text-slate-400">O diagnóstico precisa de um perfil pessoal de Em, G, C e D.</p>
          <button type="button" onClick={onRecalibrate} className="game-button mt-6 w-full rounded-xl px-4 py-3 text-sm font-bold">Abrir calibração</button>
          <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400">Fechar</button>
        </section>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#020817]/95 px-3 py-4 backdrop-blur-sm sm:grid sm:place-items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="diagnostic-title" className="game-shell mx-auto w-full max-w-2xl rounded-[2rem] p-3 sm:p-5">
        <div className="rounded-[1.6rem] border border-white/[0.07] bg-[#09162a] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Teste do perfil</p><h2 id="diagnostic-title" className="mt-2 font-display text-3xl font-bold">Diagnóstico de acordes</h2><p className="mt-2 text-xs leading-5 text-slate-400">Três batidas por acorde. Não altera XP, vidas ou jornada.</p></div><button type="button" onClick={onClose} aria-label="Fechar diagnóstico" className="game-pill grid size-10 shrink-0 place-items-center rounded-full"><X className="size-4" /></button></div>

          {!completed ? (
            <div className="game-card mt-5 rounded-2xl p-5 text-center">
              <p className="text-xs text-slate-400">Acorde pedido · teste {chordAttempt} de {attemptsPerChord}</p><p className="mt-2 font-display text-6xl font-bold">{requestedChord}</p>{countdown !== null && <div aria-live="assertive" className="mx-auto mt-4 grid size-16 place-items-center rounded-full border-2 border-amber-200/60 bg-amber-300/15 font-display text-4xl font-bold text-amber-200">{countdown}</div>}<p aria-live="polite" className={`mx-auto mt-4 max-w-md rounded-xl border px-3 py-2 text-xs font-semibold leading-5 ${lastOutcome === 'correct' ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : lastOutcome === 'wrong' ? 'border-rose-300/30 bg-rose-300/10 text-rose-200' : lastOutcome === 'rejected' ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-transparent text-slate-300'}`}>{message}</p>
              <div className="mt-5 grid grid-cols-4 gap-2">{calibrationChords.map((chord) => { const chordResults = results.filter((result) => result.requested === chord); const correct = chordResults.filter((result) => result.identified === chord).length; return <div key={chord} className="rounded-xl border border-white/10 bg-white/[0.025] p-2"><strong className="text-xs">{chord}</strong><span className="mt-1 block text-[9px] text-slate-500">{chordResults.length}/{attemptsPerChord} testes</span>{chordResults.length > 0 && <span className={`mt-1 block text-[9px] ${correct === chordResults.length ? 'text-emerald-300' : 'text-rose-300'}`}>{correct} acertos</span>}</div> })}</div>
            </div>
          ) : (
            <div className="game-card mt-5 rounded-2xl p-5"><div className="text-center"><Check className="mx-auto size-8 text-emerald-300" /><h3 className="mt-3 font-display text-3xl font-bold">Diagnóstico concluído</h3><p className="mt-2 text-sm text-slate-400">{results.length} testes realizados · {correctResults} acertos · {Math.round((correctResults / results.length) * 100)}%</p><p aria-live="polite" className={`mt-2 text-[10px] ${syncStatus === 'saved' ? 'text-emerald-300' : 'text-slate-500'}`}>{syncStatus === 'saving' ? 'Salvando resultado na sua conta…' : syncStatus === 'saved' ? 'Resultado salvo na sua conta.' : syncStatus === 'local' ? 'Resultado mantido neste aparelho; não foi possível sincronizar agora.' : ''}</p></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{calibrationChords.map((chord) => { const chordResults = results.filter((result) => result.requested === chord); const correct = chordResults.filter((result) => result.identified === chord).length; return <article key={chord} className={`rounded-xl border p-3 ${correct === attemptsPerChord ? 'border-emerald-300/30 bg-emerald-300/[0.07]' : 'border-rose-300/30 bg-rose-300/[0.07]'}`}><div className="flex items-center justify-between"><strong>Pedido: {chord}</strong><span className="text-xs">{correct}/{attemptsPerChord} acertos</span></div><div className="mt-2 grid gap-1">{chordResults.map((result, index) => <p key={index} className={`text-[10px] ${result.identified === chord ? 'text-emerald-300' : 'text-rose-300'}`}>Teste {index + 1}: identificado {result.identified} · {result.confidence}% {result.identified === chord ? '· acerto' : '· erro'}</p>)}</div></article> })}</div></div>
          )}

          {!completed && micStatus !== 'active' ? <button ref={actionRef} type="button" disabled={micStatus === 'requesting'} onClick={() => void enableMicrophone()} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">{micStatus === 'requesting' ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}{micStatus === 'requesting' ? 'Abrindo microfone…' : 'Ativar microfone'}</button> : !completed ? <button ref={actionRef} type="button" disabled={captureStatus !== 'idle'} onClick={armCapture} className="game-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60"><Mic className="size-4" />{countdown !== null ? `Prepare-se · ${countdown}` : captureStatus === 'armed' ? 'Aguardando sua batida…' : captureStatus === 'analyzing' ? 'Analisando som sustentado…' : `Preparar teste de ${requestedChord}`}</button> : null}
          {(micStatus === 'denied' || micStatus === 'unsupported') && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><MicOff className="size-4" /> Verifique o acesso ao microfone neste navegador.</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={restart} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-300"><RotateCcw className="size-3.5" /> Refazer diagnóstico</button><button type="button" onClick={onRecalibrate} className="rounded-xl border border-violet-300/20 bg-violet-300/[0.06] px-4 py-3 text-xs font-semibold text-violet-200">Refazer calibração pessoal</button></div>
        </div>
      </section>
    </div>
  )
}
