import { Check, Guitar, LockKeyhole, Map as MapIcon, Play, Star } from 'lucide-react'

const stages = [
  { id: 'first-chords', prerequisite: null, available: true, title: 'Primeiros acordes', detail: 'Em, G, C e D para começar a tocar.' },
  { id: 'clean-changes', prerequisite: 'first-chords', available: false, title: 'Trocas limpas', detail: 'Mude de acorde sem perder o tempo.' },
  { id: 'essential-rhythm', prerequisite: 'clean-changes', available: false, title: 'Ritmo essencial', detail: 'Batidas simples e pulsação constante.' },
  { id: 'first-song', prerequisite: 'essential-rhythm', available: false, title: 'Primeira música', detail: 'Junte acordes e ritmo em uma canção.' },
  { id: 'harmonic-field', prerequisite: 'first-song', available: false, title: 'Campo harmônico', detail: 'Entenda como os acordes se conectam.' },
]

type Progress = { exercise_id: string; best_stars: number }

export function Journey({ progress, onStart }: { progress: Progress[]; onStart: (exerciseId: string) => void }) {
  const completedIds = new Set(progress.map((item) => item.exercise_id))
  const starsByExercise = new Map(progress.map((item) => [item.exercise_id, item.best_stars]))

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-violet-300" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Sua jornada</h3>
        </div>
        <span className="text-[10px] text-slate-500">Avance concluindo exercícios</span>
      </div>

      <div className="relative mt-5 space-y-3 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-white/10">
        {stages.map((stage) => {
          const completed = completedIds.has(stage.id)
          const unlocked = !stage.prerequisite || completedIds.has(stage.prerequisite)
          const current = unlocked && !completed
          const playable = unlocked && stage.available
          const bestStars = starsByExercise.get(stage.id) ?? 0

          return (
            <button type="button" disabled={!playable} onClick={playable ? () => onStart(stage.id) : undefined} key={stage.id} className={`relative flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition sm:p-4 ${
              current
                ? 'border-cyan-300/30 bg-gradient-to-r from-cyan-300/[0.1] to-violet-400/[0.06]'
                : completed
                  ? 'border-emerald-400/20 bg-emerald-400/[0.05]'
                  : unlocked
                    ? 'border-violet-400/20 bg-violet-400/[0.05]'
                    : 'border-white/[0.07] bg-black/10 opacity-60'
            }`}>
              <div className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full border ${
                current
                  ? 'border-cyan-200 bg-cyan-300 text-[#07101f] shadow-[0_0_24px_rgba(103,232,249,0.25)]'
                  : completed
                    ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-300'
                    : 'border-white/10 bg-[#111c30] text-slate-500'
              }`}>
                {completed ? <Check className="size-4" /> : current && stage.available ? <Play className="ml-0.5 size-4" /> : unlocked ? <Guitar className="size-4" /> : <LockKeyhole className="size-3.5" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${unlocked ? 'text-white' : 'text-slate-500'}`}>{stage.title}</p>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                    current ? 'bg-cyan-300/15 text-cyan-200' : completed ? 'bg-emerald-300/10 text-emerald-300' : 'bg-white/5 text-slate-600'
                  }`}>
                    {completed ? 'Concluída' : current && stage.available ? 'Etapa atual' : unlocked ? 'Liberada' : 'Bloqueada'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{stage.detail}</p>
                {bestStars > 0 && <div className="mt-2 flex gap-1" aria-label={`Melhor resultado: ${bestStars} estrelas`}>{[1, 2, 3].map((star) => <Star key={star} className={`size-3.5 ${star <= bestStars ? 'fill-amber-300 text-amber-300' : 'text-white/10'}`} />)}</div>}
              </div>

              {playable && <Guitar className="hidden size-5 shrink-0 text-cyan-300/60 sm:block" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
