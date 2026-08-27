import { Check, Clock3, Heart, Play, RotateCcw, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const questions = [
  { prompt: 'O que significa a cifra Em?', options: ['Mi menor', 'Mi maior', 'Ré menor'], answer: 'Mi menor' },
  { prompt: 'Qual destes é um acorde maior?', options: ['Am', 'Em', 'G'], answer: 'G' },
  { prompt: 'Qual sequência pertence à primeira etapa?', options: ['Em · G · C · D', 'F#m · C# · B', 'Bb · Eb · F'], answer: 'Em · G · C · D' },
]

const practiceRounds = [
  { chord: 'Em', title: 'Monte o Mi menor', instruction: 'Forme o acorde Em e toque quatro batidas lentas.' },
  { chord: 'Em → G', title: 'Faça a primeira troca', instruction: 'Alterne entre Em e G sem parar o movimento.' },
  { chord: 'Em → G → C → D', title: 'Complete a sequência', instruction: 'Toque a sequência inteira duas vezes.' },
]

export function ChordExercise({ onClose, onComplete }: { onClose: () => void; onComplete: (stars: number) => Promise<boolean> }) {
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

  const restart = () => {
    setQuestion(0)
    setLives(3)
    setWrongAnswer(null)
    setFailed(false)
    setPhase('quiz')
    setRound(0)
    setSeconds(20)
    setRunning(false)
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
      return
    }

    setSaving(true)
    const saved = await onComplete(lives)
    if (saved) setFinished(true)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#030815]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Exercício Primeiros acordes">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-300/20 bg-[#0a1528] p-5 shadow-2xl shadow-black/60 sm:p-7">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">Primeiros acordes</p><p className="mt-1 text-xs text-slate-500">{phase === 'quiz' ? 'Parte 1 · Perguntas' : 'Parte 2 · Prática no violão'}</p></div>
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
              <p className="font-display text-3xl font-semibold text-violet-200">{practiceRounds[round].chord}</p>
              <h3 className="mt-4 text-lg font-semibold">{practiceRounds[round].title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{practiceRounds[round].instruction}</p>
              <div className={`mx-auto mt-6 grid size-24 place-items-center rounded-full border-4 font-display text-3xl font-semibold ${seconds === 0 ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-300' : 'border-cyan-300/30 bg-cyan-300/[0.06] text-cyan-200'}`}>
                {seconds === 0 ? <Check className="size-9" /> : seconds}
              </div>
            </div>

            {seconds > 0 ? (
              <button type="button" disabled={running} onClick={() => setRunning(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07101f] disabled:bg-cyan-300/40">
                {running ? <><Clock3 className="size-4" /> Toque por {seconds}s</> : <><Play className="size-4" /> Iniciar rodada de 20s</>}
              </button>
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
