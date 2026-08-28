import { Guitar, LogOut } from 'lucide-react'
import { AuthPanel } from './components/AuthPanel'
import { Dashboard } from './components/Dashboard'
import { useAuth } from './hooks/use-auth'

function App() {
  const { session, loading, signOut } = useAuth()

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.17),transparent_25%),radial-gradient(circle_at_88%_14%,rgba(139,92,246,0.2),transparent_28%),linear-gradient(180deg,#07101f_0%,#09152a_55%,#07101f_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-lg shadow-black/10 backdrop-blur sm:p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 -rotate-3 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-300 via-blue-400 to-violet-500 shadow-[0_5px_0_#3730a3]">
              <Guitar className="size-5" />
            </div>
            <div>
              <strong className="font-display text-lg font-bold tracking-tight">Meu Violão</strong>
              <p className="text-xs text-cyan-100/60">Sua jornada musical</p>
            </div>
          </div>
          {session ? (
            <button type="button" onClick={signOut} className="game-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-white">
              <LogOut className="size-3.5" /> Sair
            </button>
          ) : (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              XP em progresso
            </span>
          )}
        </header>

        {loading ? (
          <div className="grid flex-1 place-items-center text-sm text-slate-400">Verificando sua sessão…</div>
        ) : session ? (
          <section className="mx-auto flex w-full max-w-4xl flex-1 items-center py-10 sm:py-14">
            <div className="w-full"><Dashboard user={session.user} /></div>
          </section>
        ) : (
          <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">Aprenda no seu ritmo</p>
              <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-7xl">
                Sua prática de violão, organizada como uma jornada.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Um projeto novo, limpo e focado no essencial: praticar, acompanhar a evolução e avançar um passo por vez.
              </p>
            </div>
            <AuthPanel />
          </section>
        )}

        <footer className="border-t border-white/10 pt-5 text-xs text-slate-500">
          React · TypeScript · Vite · Tailwind · Supabase
        </footer>
      </div>
    </main>
  )
}

export default App
