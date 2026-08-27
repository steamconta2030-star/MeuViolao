import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Profile = {
  daily_goal_minutes: number
  display_name: string | null
  xp: number
}

type PracticeSession = {
  id: string
  minutes: number
  practiced_on: string
}

type ExerciseProgress = {
  exercise_id: string
  best_stars: number
  completions: number
}

const XP_PER_MINUTE = 2
const XP_PER_LEVEL = 100
const DAILY_GOAL_BONUS_XP = 20

const localDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function usePracticeData(user: User) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)

    const [profileResult, sessionsResult, progressResult] = await Promise.all([
      supabase.from('profiles').select('display_name, daily_goal_minutes, xp').eq('user_id', user.id).maybeSingle(),
      supabase.from('practice_sessions').select('id, minutes, practiced_on').eq('user_id', user.id).order('practiced_on', { ascending: false }),
      supabase.from('exercise_progress').select('exercise_id, best_stars, completions').eq('user_id', user.id),
    ])

    if (profileResult.error) {
      setError(profileResult.error.message)
      setLoading(false)
      return
    }

    let nextProfile = profileResult.data as Profile | null
    if (!nextProfile) {
      const created = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select('display_name, daily_goal_minutes, xp')
        .single()
      if (created.error) {
        setError(created.error.message)
        setLoading(false)
        return
      }
      nextProfile = created.data as Profile
    }

    if (sessionsResult.error) setError(sessionsResult.error.message)
    if (progressResult.error) setError(progressResult.error.message)
    setProfile(nextProfile)
    setSessions((sessionsResult.data ?? []) as PracticeSession[])
    setExerciseProgress((progressResult.data ?? []) as ExerciseProgress[])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const addPractice = async (minutes: number, source: 'manual' | 'exercise' = 'manual') => {
    if (!supabase) return
    setSaving(true)
    setError(null)
    const today = localDate()
    const dailyGoal = profile?.daily_goal_minutes ?? 15
    const previousTodayMinutes = sessions
      .filter((session) => session.practiced_on === today)
      .reduce((sum, session) => sum + session.minutes, 0)
    const goalCompletedNow = previousTodayMinutes < dailyGoal && previousTodayMinutes + minutes >= dailyGoal
    const result = await supabase.from('practice_sessions').insert({
      user_id: user.id,
      minutes,
      practiced_on: localDate(),
      source,
    })
    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return null
    }

    await load()
    setSaving(false)
    return {
      xpEarned: minutes * XP_PER_MINUTE + (goalCompletedNow ? DAILY_GOAL_BONUS_XP : 0),
      goalCompletedNow,
    }
  }

  const saveExerciseProgress = async (exerciseId: string, stars: number) => {
    if (!supabase) return false
    const previous = exerciseProgress.find((item) => item.exercise_id === exerciseId)
    const result = await supabase.from('exercise_progress').upsert({
      user_id: user.id,
      exercise_id: exerciseId,
      best_stars: Math.max(previous?.best_stars ?? 0, stars),
      completions: (previous?.completions ?? 0) + 1,
      last_completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exercise_id' })

    if (result.error) {
      setError(result.error.message)
      return false
    }

    await load()
    return true
  }

  const summary = useMemo(() => {
    const today = localDate()
    const dailyGoal = profile?.daily_goal_minutes ?? 15
    const todayMinutes = sessions.filter((session) => session.practiced_on === today).reduce((sum, session) => sum + session.minutes, 0)
    const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0)
    const minutesByDay = sessions.reduce((days, session) => {
      days.set(session.practiced_on, (days.get(session.practiced_on) ?? 0) + session.minutes)
      return days
    }, new Map<string, number>())
    const completedGoalDays = [...minutesByDay.values()].filter((minutes) => minutes >= dailyGoal).length
    const practicedDays = new Set(sessions.map((session) => session.practiced_on))
    const cursor = new Date()

    if (!practicedDays.has(today)) cursor.setDate(cursor.getDate() - 1)

    let streak = 0
    while (practicedDays.has(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const totalXp = totalMinutes * XP_PER_MINUTE + completedGoalDays * DAILY_GOAL_BONUS_XP
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
    const levelXp = totalXp % XP_PER_LEVEL

    return {
      todayMinutes,
      todaySessionCount: sessions.filter((session) => session.practiced_on === today).length,
      totalMinutes,
      totalXp,
      streak,
      level,
      levelXp,
      xpPerLevel: XP_PER_LEVEL,
      todayGoalCompleted: todayMinutes >= dailyGoal,
      dailyGoalBonusXp: DAILY_GOAL_BONUS_XP,
      completedGoalDays,
    }
  }, [profile?.daily_goal_minutes, sessions])

  return { profile, summary, exerciseProgress, loading, saving, error, addPractice, saveExerciseProgress }
}
