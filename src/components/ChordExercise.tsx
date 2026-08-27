import { Heart, RotateCcw, Star, X } from 'lucide-react'
import { useState } from 'react'

const questions = [
  { prompt: 'O que significa a cifra Em?', options: ['Mi menor', 'Mi maior', 'Ré menor'], answer: 'Mi menor' },
  { prompt: 'Qual destes é um acorde maior?', options: ['Am', 'Em', 'G'], answer: 'G' },
  { prompt: 'Qual sequência pertence à primeira etapa?', options: ['Em · G · C · D', 'F#m · C# · B', 'Bb · Eb · F'], answer: 'Em · G · C · D' },
]

export function ChordExercise({ onClose, onComplete }: { onClose: () => void; onComplete: (stars: number) => Promise<void> }) {
  const [question, setQuestion] = useState(0)
  const [lives, setLives] = useState(3)
  const [wrongAnswer, setWrongAnswer] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const restart = () => {
    setQuestion(0)
    setLives(3)
    setWrongAnswer(null)
    setFailed(false)
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

    setSaving(true)
    await onComplete(lives)
    setFinished(true)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#030815]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Exercício Primeiros acordes">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-300/20 bg-[#0a1528] p-5 shadow-2xl shadow-black/60 sm:p-7">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">Primeiros acordes</p><p className="mt-1 text-xs text-slate-500">Desafio 1 de 1</p></div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white" aria-label="Fechar"><X className="size-4" /></button>
        </div>

        {!finished && !failed && (
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
