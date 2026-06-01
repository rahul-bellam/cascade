import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('$ auth: verifying credentials...');
    setTimeout(() => setMsg('$ auth: access granted'), 1200);
  };

  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head><title>login — Cascade</title></Head>
      <div className="max-w-md mx-auto pt-20">
        <h1 className="text-lg font-bold mb-6 font-mono">$ login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-[#c0c0c0] block mb-1 font-mono">email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-[#1a1a1a] text-[#00ff41] px-3 py-2 text-sm focus:border-[#00ff41] focus:outline-none font-mono" />
          </div>
          <div>
            <label className="text-xs text-[#c0c0c0] block mb-1 font-mono">password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              className="w-full bg-black border border-[#1a1a1a] text-[#00ff41] px-3 py-2 text-sm focus:border-[#00ff41] focus:outline-none font-mono" />
          </div>
          <button type="submit"
            className="w-full py-3 border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors font-mono">
            $ authenticate
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-[#c0c0c0] font-mono">{msg}</p>}
        <p className="mt-6 text-xs text-[#c0c0c0] font-mono">
          no account? <Link href="/register" className="text-[#00ff41] hover:underline">$ register</Link>
        </p>
      </div>
    </div>
  );
}
