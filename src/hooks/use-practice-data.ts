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

const localDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function usePracticeData(user: User) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)

    const [profileResult, sessionsResult] = await Promise.all([
      supabase.from('profiles').select('display_name, daily_goal_minutes, xp').eq('user_id', user.id).maybeSingle(),
      supabase.from('practice_sessions').select('id, minutes, practiced_on').eq('user_id', user.id).order('practiced_on', { ascending: false }).limit(60),
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
    setProfile(nextProfile)
    setSessions((sessionsResult.data ?? []) as PracticeSession[])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const addPractice = async (minutes: number) => {
    if (!supabase) return
    setSaving(true)
    setError(null)
    const result = await supabase.from('practice_sessions').insert({
      user_id: user.id,
      minutes,
      practiced_on: localDate(),
      source: 'manual',
    })
    if (result.error) setError(result.error.message)
    else await load()
    setSaving(false)
  }

  const summary = useMemo(() => {
    const today = localDate()
    const todayMinutes = sessions.filter((session) => session.practiced_on === today).reduce((sum, session) => sum + session.minutes, 0)
    const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0)
    return { todayMinutes, totalMinutes }
  }, [sessions])

  return { profile, summary, loading, saving, error, addPractice }
}
