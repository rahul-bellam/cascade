import Head from 'next/head';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cascade-900 to-cascade-700 text-white">
      <Head>
        <title>Cascade — Learn System Design by Breaking Things</title>
        <meta name="description" content="Competitive system design platform" />
      </Head>

      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">⚡ Cascade</h1>
        <nav className="flex gap-4">
          <a href="/learn" className="hover:text-cascade-200">Learn</a>
          <a href="/constraint" className="hover:text-cascade-200">Scale</a>
          <a href="/cascade" className="hover:text-cascade-200">Cascade</a>
          <a href="/arena" className="hover:text-cascade-200">Arena</a>
          <a href="/login" className="px-4 py-2 bg-white text-cascade-900 rounded-lg font-medium">Sign In</a>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-6xl font-bold mb-6">
          First you learn.
          <br />
          <span className="text-cascade-200">Then you break. Then you rebuild.</span>
          <br />
          Then you <span className="text-yellow-400">compete.</span>
        </h2>
        <p className="text-xl text-cascade-100 mb-12 max-w-2xl mx-auto">
          Cascade drops you into real systems — some broken, some poorly designed, 
          some that just can't handle the load. Your job: fix them, refactor them, 
          scale them, and survive the domino effect of your own decisions.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/learn" className="px-8 py-4 bg-white text-cascade-900 rounded-xl font-bold text-lg hover:bg-cascade-100 transition">
            Start Learning →
          </a>
          <a href="/arena" className="px-8 py-4 border-2 border-white rounded-xl font-bold text-lg hover:bg-white/10 transition">
            Enter Arena
          </a>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-8 text-left">
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="text-xl font-bold mb-2">Learn</h3>
            <p className="text-cascade-200">60% concept + 40% code. Every lesson builds your personal toolkit of reusable patterns.</p>
          </div>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-3">🔓</div>
            <h3 className="text-xl font-bold mb-2">Scale</h3>
            <p className="text-cascade-200">Start with a monolith. Each level introduces a brutal new constraint. Scale or die.</p>
          </div>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl mb-3">⚔️</div>
            <h3 className="text-xl font-bold mb-2">Compete</h3>
            <p className="text-cascade-200">Duel other engineers. Your design vs. theirs. Under real load. Winner takes the ELO.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
