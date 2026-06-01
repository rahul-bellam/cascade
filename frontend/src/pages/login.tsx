import Head from 'next/head';

export default function LoginPage() {
  return (
    <>
      <Head><title>login — cascade</title></Head>
      <div className="max-w-md mx-auto mt-16">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6">
          <div className="text-xs text-[#006622] mb-4">
            {`> authentication required`}
          </div>
          <h1 className="text-lg font-medium mb-6 text-[#00ff41]">$ login</h1>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#008822] block mb-1">username</label>
              <input type="text" className="terminal-input w-full" placeholder="enter username" />
            </div>
            <div>
              <label className="text-xs text-[#008822] block mb-1">password</label>
              <input type="password" className="terminal-input w-full" placeholder="enter password" />
            </div>
            <button className="terminal-btn w-full">
              $ authenticate
            </button>
          </div>

          <div className="mt-4 text-xs text-[#004d1a] text-center">
            no account? <a href="#" className="text-[#00cc33] hover:text-[#00ff41] underline underline-offset-4">register</a>
          </div>
        </div>
      </div>
    </>
  );
}
