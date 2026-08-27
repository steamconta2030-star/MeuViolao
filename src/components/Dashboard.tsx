import type { User } from '@supabase/supabase-js'
import { Clock3, Flame, LoaderCircle, Plus, Sparkles, Target, Trophy } from 'lucide-react'
import { usePracticeData } from '../hooks/use-practice-data'

export function Dashboard({ user }: { user: User }) {
  const { profile, summary, loading, saving, error, addPractice } = usePracticeData(user)

  if (loading) {
    return <div className="grid min-h-96 place-items-center text-sm text-slate-400"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Carregando painel…</div>
  }

  const goal = profile?.daily_goal_minutes ?? 15
  const progress = Math.min(100, Math.round((summary.todayMinutes / goal) * 100))
  const levelProgress = Math.round((summary.levelXp / summary.xpPerLevel) * 100)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="rounded-3xl border border-white/10 bg-[#0a1528] p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Meu painel</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Prática de hoje</h2>
        <p className="mt-2 text-sm text-slate-400">{user.email}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Target className="size-4 text-cyan-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.todayMinutes}<span className="ml-1 text-xs font-normal text-slate-400">/ {goal} min</span></p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Clock3 className="size-4 text-violet-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.totalMinutes}<span className="ml-1 text-xs font-normal text-slate-400">min registrados</span></p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Sparkles className="size-4 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.totalXp}<span className="ml-1 text-xs font-normal text-slate-400">XP</span></p>
            <p className="mt-1 text-[10px] text-slate-500">2 XP por minuto</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Flame className="size-4 text-orange-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.streak}<span className="ml-1 text-xs font-normal text-slate-400">{summary.streak === 1 ? 'dia' : 'dias'}</span></p>
            <p className="mt-1 text-[10px] text-slate-500">sequência de prática</p>
          </article>
        </div>

        <article className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-violet-400/15 text-violet-300">
                <Trophy className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">Nível de prática</p>
                <p className="mt-1 font-display text-2xl font-semibold">Nível {summary.level}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400"><span className="font-semibold text-white">{summary.levelXp}</span> / {summary.xpPerLevel} XP</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-300 to-violet-400 transition-all" style={{ width: `${levelProgress}%` }} />
          </div>
          <p className="mt-2 text-right text-[10px] text-slate-500">Faltam {summary.xpPerLevel - summary.levelXp} XP para o nível {summary.level + 1}</p>
        </article>

        <div className="mt-6">
          <p className="text-xs font-medium text-slate-300">Registrar prática rápida</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[5, 10, 15].map((minutes) => (
              <button key={minutes} disabled={saving} type="button" onClick={() => void addPractice(minutes)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold transition enabled:hover:border-cyan-300/40 enabled:hover:bg-cyan-300/10 disabled:opacity-50">
                <Plus className="size-3.5" /> {minutes} min
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
