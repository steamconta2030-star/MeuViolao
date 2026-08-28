import { Check, Guitar, LockKeyhole, Map as MapIcon, Play, Star } from 'lucide-react'

const stages = [
  { id: 'first-chords', prerequisite: null, available: true, title: 'Primeiros acordes', detail: 'Em, G, C e D para começar a tocar.' },
  { id: 'clean-changes', prerequisite: 'first-chords', available: true, title: 'Trocas limpas', detail: 'Mude de acorde sem perder o tempo.' },
  { id: 'essential-rhythm', prerequisite: 'clean-changes', available: true, title: 'Mão direita e pulsação', detail: 'Pulso firme e primeira alternância entre baixo e cima.' },
  { id: 'first-song', prerequisite: 'essential-rhythm', available: false, title: 'Primeira música', detail: 'Junte acordes e ritmo em uma canção.' },
  { id: 'harmonic-field', prerequisite: 'first-song', available: false, title: 'Campo harmônico', detail: 'Entenda como os acordes se conectam.' },
]

type Progress = { exercise_id: string; best_stars: number }

export function Journey({ progress, onStart }: { progress: Progress[]; onStart: (exerciseId: string) => void }) {
  const completedIds = new Set(progress.map((item) => item.exercise_id))
  const starsByExercise = new Map(progress.map((item) => [item.exercise_id, item.best_stars]))

  return (
    <section className="game-card mt-5 overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><MapIcon className="size-4" /></div>
          <div><h3 className="text-sm font-bold text-white">Sua jornada</h3><p className="text-[10px] text-slate-500">Um passo musical por vez</p></div>
        </div>
        <span className="text-[10px] text-slate-500">Avance concluindo exercícios</span>
      </div>

      <div className="relative mt-6 space-y-5 before:absolute before:bottom-8 before:left-1/2 before:top-8 before:w-1 before:-translate-x-1/2 before:rounded-full before:bg-gradient-to-b before:from-cyan-300/35 before:via-violet-400/25 before:to-white/5">
        {stages.map((stage, index) => {
          const completed = completedIds.has(stage.id)
          const unlocked = !stage.prerequisite || completedIds.has(stage.prerequisite)
          const current = unlocked && !completed
          const playable = unlocked && stage.available
          const bestStars = starsByExercise.get(stage.id) ?? 0

          return (
            <button type="button" disabled={!playable} onClick={playable ? () => onStart(stage.id) : undefined} key={stage.id} className={`relative z-10 flex w-[92%] items-center gap-3 rounded-2xl border p-3 text-left transition sm:w-[82%] sm:p-4 ${index % 2 === 0 ? 'mr-auto' : 'ml-auto flex-row-reverse text-right'} ${
              current
                ? 'border-cyan-300/40 bg-gradient-to-r from-cyan-300/[0.14] to-violet-400/[0.08] shadow-[0_5px_0_#0e7490]'
                : completed
                  ? 'border-emerald-400/30 bg-emerald-400/[0.08] shadow-[0_4px_0_#065f46]'
                  : unlocked
                    ? 'border-violet-400/25 bg-violet-400/[0.07] shadow-[0_4px_0_#312e81]'
                    : 'border-white/[0.07] bg-[#07101f]/80 opacity-55'
            }`}>
              <div className={`relative z-10 grid size-14 shrink-0 place-items-center rounded-full border-2 transition ${
                current
                  ? 'border-cyan-100 bg-gradient-to-b from-cyan-200 to-cyan-400 text-[#07101f] shadow-[0_5px_0_#0e7490,0_0_28px_rgba(103,232,249,0.28)]'
                  : completed
                    ? 'border-emerald-200/50 bg-emerald-300 text-emerald-950 shadow-[0_5px_0_#047857]'
                    : unlocked
                      ? 'border-violet-200/30 bg-violet-400/25 text-violet-200 shadow-[0_5px_0_#312e81]'
                      : 'border-white/10 bg-[#111c30] text-slate-600 shadow-[0_5px_0_#020617]'
              }`}>
                {completed ? <Check className="size-5" /> : current && stage.available ? <Play className="ml-0.5 size-5 fill-current" /> : unlocked ? <Guitar className="size-5" /> : <LockKeyhole className="size-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className={`flex flex-wrap items-center justify-between gap-2 ${index % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                  <p className={`text-sm font-semibold ${unlocked ? 'text-white' : 'text-slate-500'}`}>{stage.title}</p>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                    current ? 'bg-cyan-300/15 text-cyan-200' : completed ? 'bg-emerald-300/10 text-emerald-300' : 'bg-white/5 text-slate-600'
                  }`}>
                    {completed ? 'Concluída' : current && stage.available ? 'Etapa atual' : unlocked ? 'Liberada' : 'Bloqueada'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{stage.detail}</p>
                {bestStars > 0 && <div className={`mt-2 flex gap-1 ${index % 2 === 0 ? '' : 'justify-end'}`} aria-label={`Melhor resultado: ${bestStars} estrelas`}>{[1, 2, 3].map((star) => <Star key={star} className={`size-3.5 ${star <= bestStars ? 'fill-amber-300 text-amber-300' : 'text-white/10'}`} />)}</div>}
              </div>

              {playable && <Guitar className="hidden size-5 shrink-0 text-cyan-300/60 lg:block" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
