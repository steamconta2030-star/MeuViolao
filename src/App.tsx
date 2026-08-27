import { ArrowRight, Flame, Guitar, Sparkles, Target } from 'lucide-react'

const foundation = [
  { icon: Target, title: 'Meta diária', text: 'Uma rotina curta e clara para praticar todos os dias.' },
  { icon: Sparkles, title: 'XP e níveis', text: 'Progresso simples, construído em pequenas ondas.' },
  { icon: Flame, title: 'Consistência', text: 'Sequência de dias para ajudar a manter o hábito.' },
]

function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07101f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.16),transparent_34%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_10px_35px_rgba(34,211,238,0.22)]">
              <Guitar className="size-5" />
            </div>
            <div>
              <strong className="font-display text-lg font-semibold">Meu Violão</strong>
              <p className="text-xs text-slate-400">Prática pessoal</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
            Fundação pronta
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">Aprenda no seu ritmo</p>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-7xl">
              Sua prática de violão, organizada como uma jornada.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Um projeto novo, limpo e focado no essencial: praticar, acompanhar a evolução e avançar um passo por vez.
            </p>
            <button type="button" className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50">
              Começar fundação <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="rounded-3xl border border-white/10 bg-[#0a1528] p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Primeira onda</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">Base tecnológica</h2>
                </div>
                <span className="text-3xl">🎸</span>
              </div>
              <div className="mt-7 space-y-3">
                {foundation.map(({ icon: Icon, title, text }) => (
                  <article key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-5 text-xs text-slate-500">
          React · TypeScript · Vite · Tailwind · Supabase
        </footer>
      </div>
    </main>
  )
}

export default App
