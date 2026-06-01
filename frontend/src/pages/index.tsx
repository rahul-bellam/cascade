import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head>
        <title>cascade — system design terminal</title>
        <meta name="description" content="Learn system design by breaking things" />
      </Head>

      <header className="h-12 flex items-center px-6 border-b border-[#1a1a1a]">
        <span className="text-[#00ff41] text-sm">cascade@~$</span>
        <span className="ml-2 inline-block w-2 h-4 bg-[#00ff41] animate-blink" />
        <nav className="ml-auto flex gap-5 text-sm">
          <Link href="/learn" className="text-[#006622] hover:text-[#00ff41] transition-colors">learn</Link>
          <Link href="/predict" className="text-[#006622] hover:text-[#00ff41] transition-colors">predict</Link>
          <Link href="/constraint" className="text-[#006622] hover:text-[#00ff41] transition-colors">scale</Link>
          <Link href="/cascade" className="text-[#006622] hover:text-[#00ff41] transition-colors">cascade</Link>
          <Link href="/arena" className="text-[#006622] hover:text-[#00ff41] transition-colors">arena</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-24">
        <div className="mb-4 text-[#004d1a] text-sm">┌─[cascade]─[system design]────────────────────────────────┐</div>
        <h1 className="text-5xl font-bold mb-4 leading-tight tracking-tight">
          <span className="text-[#00ff41]">first you learn.</span>
          <br />
          <span className="text-[#009922]">then you break.</span>
          <br />
          <span className="text-[#00cc33]">then you rebuild.</span>
          <br />
          <span className="text-[#ff3333]">then you compete.</span>
        </h1>
        <div className="mb-4 text-[#004d1a] text-sm">└────────────────────────────────────────────────────────────┘</div>

        <p className="text-sm text-[#008822] mb-12 max-w-2xl leading-relaxed">
          {`> cascade drops you into real systems -- some broken, some poorly designed,`}
          <br />
          {`> some that just can't handle the load. your job: fix them, refactor them,`}
          <br />
          {`> scale them, and survive the domino effect of your own decisions.`}
        </p>

        <div className="flex gap-4 mb-24">
          <Link href="/learn" className="terminal-btn">
            $ start_learning
          </Link>
          <Link href="/arena" className="terminal-btn-red">
            $ enter_arena
          </Link>
          <Link href="/constraint" className="border border-[#1a1a1a] text-[#006622] px-4 py-2 text-sm hover:border-[#00cc33] hover:text-[#00cc33] transition-colors">
            $ try_scale
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
          {[
            { icon: '>>', title: 'learn', desc: '60% concept + 40% code. every lesson builds your personal toolkit of reusable patterns.', color: '#00ff41' },
            { icon: '->', title: 'predict', desc: 'forecast failures before they happen. reason about root causes, then implement the fix.', color: '#00cc33' },
            { icon: '**', title: 'scale', desc: 'start with a monolith. each level introduces a brutal new constraint. scale or die.', color: '#009922' },
            { icon: '!!', title: 'compete', desc: 'duel other engineers. your design vs. theirs. under real load. winner takes the elo.', color: '#ff3333' },
          ].map((item) => (
            <div key={item.title} className="bg-black p-5 hover:bg-[#0a0a0a] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: item.color }}>{item.icon}</span>
                <h3 className="text-sm font-medium" style={{ color: item.color }}>{item.title}</h3>
              </div>
              <p className="text-xs text-[#006622] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-xs text-[#004d1a]">
          <span className="inline-block w-2 h-3 bg-[#004d1a] animate-blink mr-2" />
          system ready. waiting for input...
        </div>
      </main>
    </div>
  );
}
