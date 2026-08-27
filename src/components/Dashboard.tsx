import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Check, CheckCircle2, Clock3, Flame, ListChecks, LoaderCircle, Plus, Sparkles, Target, Trophy } from 'lucide-react'
import { usePracticeData } from '../hooks/use-practice-data'
import { Journey } from './Journey'

export function Dashboard({ user }: { user: User }) {
  const { profile, summary, loading, saving, error, addPractice } = usePracticeData(user)
  const [feedback, setFeedback] = useState<{ title: string; detail: string } | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
  }, [])

  if (loading) {
    return <div className="grid min-h-96 place-items-center text-sm text-slate-400"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Carregando painel…</div>
  }

  const goal = profile?.daily_goal_minutes ?? 15
  const progress = Math.min(100, Math.round((summary.todayMinutes / goal) * 100))
  const levelProgress = Math.round((summary.levelXp / summary.xpPerLevel) * 100)
  const missions = [
    { title: 'Aquecimento', detail: 'Pratique por 5 minutos', current: Math.min(summary.todayMinutes, 5), target: 5, unit: 'min' },
    { title: 'Meta do dia', detail: `Alcance ${goal} minutos`, current: Math.min(summary.todayMinutes, goal), target: goal, unit: 'min' },
    { title: 'Duas sessões', detail: 'Volte ao violão duas vezes', current: Math.min(summary.todaySessionCount, 2), target: 2, unit: 'sessões' },
  ]

  const handleAddPractice = async (minutes: number) => {
    const previousLevel = summary.level
    const reward = await addPractice(minutes)
    if (!reward) return

    const nextLevel = Math.floor((summary.totalXp + reward.xpEarned) / summary.xpPerLevel) + 1
    const nextFeedback = nextLevel > previousLevel
      ? { title: `Nível ${nextLevel} alcançado!`, detail: `+${reward.xpEarned} XP nesta prática` }
      : reward.goalCompletedNow
        ? { title: 'Meta diária concluída!', detail: `+${reward.xpEarned} XP com o bônus` }
        : { title: `+${reward.xpEarned} XP`, detail: `${minutes} minutos registrados` }

    setFeedback(nextFeedback)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2800)
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="rounded-3xl border border-white/10 bg-[#0a1528] p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Meu painel</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Prática de hoje</h2>
        <p className="mt-2 text-sm text-slate-400">{user.email}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <article className={`rounded-2xl border p-4 transition ${summary.todayGoalCompleted ? 'border-emerald-400/30 bg-emerald-400/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}>
            {summary.todayGoalCompleted ? <CheckCircle2 className="size-4 text-emerald-300" /> : <Target className="size-4 text-cyan-300" />}
            <p className="mt-3 text-2xl font-semibold">{summary.todayMinutes}<span className="ml-1 text-xs font-normal text-slate-400">/ {goal} min</span></p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className={`mt-2 text-[10px] ${summary.todayGoalCompleted ? 'font-semibold text-emerald-300' : 'text-slate-500'}`}>
              {summary.todayGoalCompleted ? `Meta concluída · +${summary.dailyGoalBonusXp} XP` : `Recompensa: +${summary.dailyGoalBonusXp} XP`}
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Clock3 className="size-4 text-violet-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.totalMinutes}<span className="ml-1 text-xs font-normal text-slate-400">min registrados</span></p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Sparkles className="size-4 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold">{summary.totalXp}<span className="ml-1 text-xs font-normal text-slate-400">XP</span></p>
            <p className="mt-1 text-[10px] text-slate-500">2 XP por minuto + bônus</p>
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

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-cyan-300" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Missões de hoje</h3>
            </div>
            <span className="text-[10px] text-slate-500">{missions.filter((mission) => mission.current >= mission.target).length}/3 concluídas</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {missions.map((mission) => {
              const completed = mission.current >= mission.target
              const missionProgress = Math.round((mission.current / mission.target) * 100)
              return (
                <article key={mission.title} className={`rounded-xl border p-3 ${completed ? 'border-emerald-400/25 bg-emerald-400/[0.07]' : 'border-white/10 bg-white/[0.025]'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-white">{mission.title}</p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">{mission.detail}</p>
                    </div>
                    {completed && <Check className="size-4 shrink-0 text-emerald-300" />}
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full transition-all ${completed ? 'bg-emerald-300' : 'bg-cyan-300'}`} style={{ width: `${missionProgress}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{mission.current}/{mission.target} {mission.unit}</p>
                </article>
              )
            })}
          </div>
        </section>

        <div className="mt-6">
          <p className="text-xs font-medium text-slate-300">Registrar prática rápida</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[5, 10, 15].map((minutes) => (
              <button key={minutes} disabled={saving} type="button" onClick={() => void handleAddPractice(minutes)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold transition enabled:hover:border-cyan-300/40 enabled:hover:bg-cyan-300/10 disabled:opacity-50">
                <Plus className="size-3.5" /> {minutes} min
              </button>
            ))}
          </div>
        </div>
        <Journey level={summary.level} />
        {error && <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>}
      </div>
      {feedback && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-cyan-300/25 bg-[#0b1930]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-violet-400 text-[#07101f]"><Sparkles className="size-4" /></div>
            <div><p className="text-sm font-semibold text-white">{feedback.title}</p><p className="mt-1 text-xs text-slate-400">{feedback.detail}</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
