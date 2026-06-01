import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head><title>cascade — system design terminal</title></Head>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="border border-[#1a1a1a] p-6 mb-8">
          <div className="text-[#c0c0c0] text-xs mb-4">┌─[cascade@system]─[~]</div>
          <pre className="text-sm leading-relaxed mb-6 font-mono">
{'  ______     ______     ______    __     __    ______    __  __   '}
{' /\\___  \\   /\\  __ \\   /\\  __ \\  /\\ \\   /\\ \\  /\\  ___\\  /\\ \\_\\ \\  '}
{' \\/_/  /__  \\ \\ \\/\\ \\ \\ \\  __ \\ \\ \\ \\  \\ \\ \\ \\ \\___  \\ \\ \\____ \\ '}
{'   /\\____\\  \\ \\_____\\ \\ \\_\\ \\_\\ \\ \\_\\  \\ \\_\\ \\/\\_____\\ \\/\\_____\\'}
{'   \\/_____/   \\/_____/  \\/_/\\/_/  \\/_/   \\/_/  \\/_____/  \\/_____/'}
          </pre>
          <div className="text-lg font-bold mb-4 text-[#00ff41]">
            $ first you learn<br />
            <span className="text-[#c0c0c0]">$ then you break</span><br />
            <span className="text-[#ff3333]">$ then you compete</span>
          </div>
          <div className="text-[#c0c0c0] text-xs">└──────────────────────────────┘</div>
        </div>

        <div className="flex gap-4 mb-8">
          <Link href="/learn"
            className="flex-1 px-6 py-4 border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors text-center font-mono">
            $ start_learning
          </Link>
          <Link href="/cascade"
            className="flex-1 px-6 py-4 border border-[#ff3333] text-[#ff3333] hover:bg-[#ff3333] hover:text-black transition-colors text-center font-mono">
            $ start_breaking
          </Link>
          <Link href="/league"
            className="flex-1 px-6 py-4 border border-[#c0c0c0] text-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-colors text-center font-mono">
            $ start_competing
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { href: '/learn', label: '[1] learn', desc: 'interactive lessons with concept panels + code editor + test runner' },
            { href: '/predict', label: '[2] predict', desc: 'predict failures before they happen, reason about tradeoffs' },
            { href: '/constraint', label: '[3] scale', desc: 'fix constraints under load — optimize latency + throughput' },
            { href: '/cascade', label: '[4] cascade', desc: 'navigate failure DAGs — every fix triggers a new failure' },
            { href: '/arena', label: '[5] arena', desc: 'head-to-head system design duels' },
            { href: '/league', label: '[6] league', desc: 'seasonal standings with promotion/relegation' },
            { href: '/refactor', label: '[7] refactor', desc: 'explore codebase dependency graphs with force-directed viz' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="border border-[#1a1a1a] p-4 hover:border-[#c0c0c0] transition-colors group">
              <div className="text-[#00ff41] font-bold mb-1 group-hover:text-[#00cc33]">{item.label}</div>
              <div className="text-[#c0c0c0] text-xs">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
