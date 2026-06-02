import React from 'react';
import Link from 'next/link';
import { Layout } from '../components/layout/Layout';

export default function LoginPage() {
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const path = mode === 'login' ? '/api/auth/api/v1/auth/login' : '/api/auth/api/v1/auth/register';
      const body = mode === 'login' ? { email, password } : { username, email, password };
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? (mode === 'login' ? 'Welcome back.' : 'Account created — you can sign in now.') : (data.detail || `Error ${res.status}`));
    } catch { setMsg('Auth service unreachable (start it on :8081).'); }
    finally { setBusy(false); }
  };

  return (
    <Layout title={mode === 'login' ? 'Sign in' : 'Sign up'} nav={false}>
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block text-center font-serif text-2xl font-600">Cascade<span className="text-accent-500">.</span></Link>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft">
            <h1 className="font-serif text-2xl font-600">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="mb-6 mt-1 text-sm text-muted">
              {mode === 'login' ? 'Continue your study.' : 'Begin building real engineering instinct.'}
            </p>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <Field id="username" label="Name" value={username} onChange={setUsername} placeholder="Ada Lovelace" autoComplete="username" />
              )}
              <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
              <Field id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="submit" disabled={busy}
                className="w-full rounded-full bg-accent-600 py-3 font-500 text-white transition hover:bg-accent-700 disabled:opacity-50">
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            </form>
            {msg && <div role="status" className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-muted">{msg}</div>}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            {mode === 'login' ? "New here? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(null); }} className="text-accent-700 hover:underline">
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}

function Field({ id, label, value, onChange, type = 'text', placeholder, autoComplete }:
  { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-500 text-fg">{label}</label>
      <input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent-400" />
    </div>
  );
}
