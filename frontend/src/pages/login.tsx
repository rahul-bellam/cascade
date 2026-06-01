import Head from 'next/head';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: connect to auth service
    console.log('Login attempt', { email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cascade-900 to-cascade-700 text-white flex items-center justify-center">
      <Head>
        <title>Login — Cascade</title>
      </Head>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Welcome back</h1>
        <p className="text-cascade-200 text-center mb-8">Sign in to continue your journey</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-cascade-200/50 focus:outline-none focus:border-cascade-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-cascade-200/50 focus:outline-none focus:border-cascade-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-white text-cascade-900 rounded-lg font-bold text-lg hover:bg-cascade-100 transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-6 text-cascade-200">
          Don't have an account?{' '}
          <a href="/register" className="text-white hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}