import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLogin) {
        // Assume JWT token in data.token, typically we'd save to localStorage or cookies
        if (data.token) localStorage.setItem('token', data.token);
        router.push('/');
      } else {
        // Switch to login after successful register
        setIsLogin(true);
        setEmail('');
        setPassword('');
        alert('Registration successful! Please sign in.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-['Inter',sans-serif] flex flex-col md:flex-row overflow-hidden">
      <Head>
        <title>{isLogin ? 'Sign In' : 'Join'} — Cascade</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Left Marketing Panel */}
      <div className="flex-1 bg-[#2563EB] p-12 flex flex-col justify-between relative overflow-hidden text-white">
        {/* Abstract background shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#3B82F6] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10">
          <div className="text-3xl font-extrabold tracking-tighter mb-16 flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-[#2563EB] flex items-center justify-center rounded-sm">C</div>
            CASCADE
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Master<br />System Design.
          </h1>
          <p className="text-[#F8FAFC] text-xl font-medium max-w-md leading-relaxed opacity-90">
            Build resilience against catastrophic failures. Enter the Arena and climb the ranks.
          </p>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-2 gap-4">
          <div className="bg-[#3B82F6]/30 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl mb-2">🛡️</div>
            <div className="font-bold text-lg">Safe Sandbox</div>
            <div className="text-sm opacity-80 mt-1">Break things without taking down production.</div>
          </div>
          <div className="bg-[#3B82F6]/30 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl mb-2">⚔️</div>
            <div className="font-bold text-lg">Arena Duels</div>
            <div className="text-sm opacity-80 mt-1">Real-time WebSocket multiplayer combat.</div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-white relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold mb-3">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-[#1E293B]/60 font-medium">
              {isLogin ? 'Enter your details to access the dashboard.' : 'Start your journey as a System Architect.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#F97316]/10 text-[#F97316] font-bold rounded-xl border border-[#F97316]/20 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wide text-[#1E293B]/70">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-[#F8FAFC] border-2 border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors font-medium text-lg placeholder-[#1E293B]/30"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wide text-[#1E293B]/70">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-[#F8FAFC] border-2 border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors font-medium text-lg placeholder-[#1E293B]/30"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#3B82F6] text-white rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Join Cascade')}
            </button>
          </form>

          <div className="mt-10 text-center font-medium">
            <span className="text-[#1E293B]/60">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
