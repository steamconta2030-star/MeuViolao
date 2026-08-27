import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!supabase) {
      setError('Conecte o Supabase para ativar o acesso.')
      return
    }

    setLoading(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Cadastro realizado. Confira seu e-mail para confirmar a conta.')
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="rounded-3xl border border-white/10 bg-[#0a1528] p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Acesso pessoal</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">
          {mode === 'login' ? 'Entre para praticar' : 'Crie sua conta'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Seu progresso ficará associado ao seu próprio usuário.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-200">
            Interface pronta. Falta adicionar as chaves publicáveis do Supabase para ativar o login.
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-300">E-mail</span>
            <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 focus-within:border-cyan-300/50">
              <Mail className="size-4 text-slate-500" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="voce@email.com"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-300">Senha</span>
            <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 focus-within:border-cyan-300/50">
              <LockKeyhole className="size-4 text-slate-500" />
              <input
                required
                minLength={6}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="Mínimo de 6 caracteres"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="text-slate-500 hover:text-white" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          {message && <p className="text-xs text-emerald-300">{message}</p>}

          <button disabled={loading || !isSupabaseConfigured} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition enabled:hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-45">
            {loading && <LoaderCircle className="size-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button type="button" onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-cyan-300">
          {mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entre agora'}
        </button>
      </div>
    </div>
  )
}
