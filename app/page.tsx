import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap, CheckCircle, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">

      {/* Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            PD
          </div>
          <span className="font-semibold text-xl tracking-tight">PadhAI Dost</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="#metrics" className="hover:text-blue-600 transition-colors">Impact</Link>
          <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
        </nav>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Get Started
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-6 flex flex-col items-center text-center">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-zinc-950 [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] opacity-20"></div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6 dark:bg-blue-900/30 dark:text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v2.0 Now Live
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 bg-gradient-to-br from-zinc-900 to-zinc-500 bg-clip-text text-transparent dark:from-white dark:to-zinc-500">
            Your Intelligence, <br /> Augmented.
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10">
            PadhAI Dost transforms your static PDFs into interactive conversations and smart flashcards using advanced RAG technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              Start Learning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/AB0204/PadhAI-Dost"
              target="_blank"
              className="px-8 py-3 rounded-xl bg-white text-zinc-900 border border-zinc-200 font-semibold hover:bg-zinc-50 transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800"
            >
              View GitHub
            </Link>
          </div>
        </section>

        {/* Impact Metrics Section */}
        <section id="metrics" className="py-20 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-12">
              <div className="text-left max-w-lg">
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  Real-World Impact
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Engineered for performance. Our optimized RAG pipeline delivers precise answers faster than traditional search, empowering students to retain more information in less time.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl">
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="text-4xl font-bold text-blue-600 mb-1">&lt;200ms</div>
                  <div className="text-sm font-medium text-zinc-500">Response Latency</div>
                </div>
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="text-4xl font-bold text-green-500 mb-1">98%</div>
                  <div className="text-sm font-medium text-zinc-500">Retrieval Accuracy</div>
                </div>
                <div className="col-span-2 md:col-span-1 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="text-4xl font-bold text-orange-500 mb-1">10k+</div>
                  <div className="text-sm font-medium text-zinc-500">Documents Processed</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="py-8 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500">
        <p>© 2026 PadhAI Dost. Built with ❤️ by Abhi Bhardwaj.</p>
      </footer>
    </div>
  );
}
