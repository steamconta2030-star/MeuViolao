import { Guitar, LogOut } from 'lucide-react'
import { AuthPanel } from './components/AuthPanel'
import { Dashboard } from './components/Dashboard'
import { useAuth } from './hooks/use-auth'

function App() {
  const { session, loading, signOut } = useAuth()

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
            XP em progresso
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
            {session && (
              <div className="mt-9 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm text-emerald-200">Conectado como {session.user.email}</p>
                <button type="button" onClick={signOut} className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white">
                  <LogOut className="size-4" /> Sair
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid min-h-96 place-items-center text-sm text-slate-400">Verificando sua sessão…</div>
          ) : session ? <Dashboard user={session.user} /> : <AuthPanel />}
        </section>

        <footer className="border-t border-white/10 pt-5 text-xs text-slate-500">
          React · TypeScript · Vite · Tailwind · Supabase
        </footer>
      </div>
    </main>
  )
}

export default App
