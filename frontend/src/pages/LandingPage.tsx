import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";

const GRID_BG = {
  backgroundImage:
    "linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

const problems = [
  {
    icon: "⛓️",
    title: "Chain Complexity",
    desc: "Manually bridge assets, manage gas on different chains, and handle complex swap UIs just to send money.",
  },
  {
    icon: "🪪",
    title: "Identity Gap",
    desc: "You need a 0x address. Your friend only has an ENS name. One wrong character and funds are gone.",
  },
  {
    icon: "🔄",
    title: "Wrong Token",
    desc: "You have ETH. They want USDT. That's 3 manual steps — find a DEX, approve, swap — before you can even pay.",
  },
];

const steps = [
  {
    number: "01",
    title: "State your intent",
    desc: "Type naturally: \"Send 50 USDT to vitalik.eth\"",
    detail: "No chain selection. No address lookup. No token research.",
  },
  {
    number: "02",
    title: "Agent reasons",
    desc: "AI resolves ENS, scans 5 chains, finds the cheapest path",
    detail: "If you lack USDT, it auto-quotes a Uniswap swap for you.",
  },
  {
    number: "03",
    title: "You confirm",
    desc: "Review the decision card, then sign in MetaMask",
    detail: "One click. You stay in control. Keys never leave your wallet.",
  },
];

const techStack = [
  { name: "Gemini AI", sub: "Reasoning Engine" },
  { name: "Alchemy", sub: "Multi-chain RPC" },
  { name: "Uniswap", sub: "Auto Liquidity" },
  { name: "ENS", sub: "Identity Layer" },
  { name: "wagmi", sub: "Wallet Signing" },
  { name: "Arbitrum", sub: "+ 4 more chains" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pb-32 pt-20 text-center" style={GRID_BG}>
        {/* glow blobs */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 top-32 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            ETHGlobal OpenAgents Hackathon
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Pay Anyone.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Any Chain.
            </span>
            <br />
            Just Say It.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Intent-based AI Agent for seamless multi-chain payments with auto-liquidity via Uniswap.
            No bridges. No chain switching. No wrong tokens.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/app"
              className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.4)] transition hover:bg-violet-500 hover:shadow-[0_0_32px_rgba(139,92,246,0.6)]"
            >
              Launch App →
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              View on GitHub
            </a>
          </div>

          {/* mock terminal */}
          <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left shadow-[0_0_40px_rgba(139,92,246,0.1)]">
            <div className="mb-3 flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
            </div>
            <p className="font-mono text-sm text-gray-400">
              <span className="text-violet-400">you</span>{" "}
              <span className="text-white">→</span>{" "}
              <span className="text-emerald-300">"send 50 USDT to alice.eth"</span>
            </p>
            <div className="mt-3 space-y-1.5 font-mono text-xs text-gray-500">
              <p><span className="text-amber-400">●</span> Resolving alice.eth → 0xABC...123</p>
              <p><span className="text-amber-400">●</span> Scanning balances across 5 chains...</p>
              <p><span className="text-amber-400">●</span> Arbitrum selected — gas $0.03</p>
              <p><span className="text-emerald-400">✓</span> Ready to sign. Total cost: $50.03</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-widest text-violet-400">
            The Problem
          </p>
          <h2 className="mb-14 text-center text-4xl font-bold">
            Web3 payments are{" "}
            <span className="text-red-400">unnecessarily hard</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {problems.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-7 transition hover:border-gray-700"
              >
                <div className="mb-4 text-3xl">{p.icon}</div>
                <h3 className="mb-3 text-lg font-semibold text-white">{p.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-24" style={GRID_BG}>
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-widest text-violet-400">
            How It Works
          </p>
          <h2 className="mb-14 text-center text-4xl font-bold">
            From intent to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              on-chain
            </span>{" "}
            in seconds
          </h2>
          <div className="relative grid gap-8 md:grid-cols-3">
            {/* connector line */}
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent md:block" />
            {steps.map((s) => (
              <div key={s.number} className="relative rounded-2xl border border-gray-800 bg-gray-950 p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
                  <span className="font-mono text-sm font-bold text-violet-400">{s.number}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mb-2 text-sm font-medium text-gray-300">{s.desc}</p>
                <p className="text-xs leading-relaxed text-gray-500">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-widest text-violet-400">
            Built With
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-300">
            Production-grade integrations
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-4 text-center transition hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
              >
                <p className="font-semibold text-white">{t.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 p-14 text-center shadow-[0_0_60px_rgba(139,92,246,0.1)]">
          <h2 className="mb-4 text-4xl font-bold">Try it now</h2>
          <p className="mb-8 text-gray-400">
            Connect your wallet and send your first intent-based payment.
          </p>
          <Link
            to="/app"
            className="inline-block rounded-xl bg-violet-600 px-10 py-4 text-base font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.4)] transition hover:bg-violet-500"
          >
            Launch App →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
          <span className="font-mono font-semibold text-violet-400">PayAgent</span>
          <span>Built for ETHGlobal OpenAgents Hackathon 2026</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}
