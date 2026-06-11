import { Button } from "@/components/ui/auth-components";
import { ArrowRight, BookOpen, Brain, Trophy, Sparkles, Github, ShieldCheck, Quote } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-canvas text-ink overflow-hidden">
            {/* Hero Section */}
            <section className="relative container mx-auto px-4 py-24">
                {/* ambient glow */}
                <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/20 blur-[140px]" />
                <div className="pointer-events-none absolute top-20 right-0 h-[300px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />

                <div className="relative text-center space-y-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/80 px-4 py-1.5 text-xs font-medium text-ink-dim backdrop-blur">
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                        Hybrid RAG · Source citations · Confidence-scored answers
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent leading-tight pb-1">
                        PadhAI-Dost
                    </h1>
                    <p className="text-xl md:text-2xl text-ink-dim">
                        Your AI-powered study companion. Upload. Ask. Learn.
                    </p>
                    <p className="text-lg text-ink-faint max-w-2xl mx-auto">
                        RAG-powered document chat, auto-generated flashcards, adaptive practice questions,
                        and multi-level explanations — all from your own study materials.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                        <Link href="/login">
                            <Button className="text-lg px-8 h-12">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <a
                            href="https://github.com/Abhics8/PadhAI-Dost"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" className="text-lg px-8 h-12">
                                <Github className="mr-2 h-5 w-5" />
                                View on GitHub
                            </Button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                    Everything You Need to Learn
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FeatureCard
                        icon={<Brain className="h-8 w-8 text-indigo-400" />}
                        title="AI Tutoring"
                        description="Chat with your documents and get answers grounded in your source material — with page-level citations"
                    />
                    <FeatureCard
                        icon={<BookOpen className="h-8 w-8 text-purple-400" />}
                        title="Smart Practice"
                        description="Auto-generated questions using Bloom's Taxonomy with adjustable difficulty"
                    />
                    <FeatureCard
                        icon={<Sparkles className="h-8 w-8 text-amber-400" />}
                        title="Auto Flashcards"
                        description="Upload a PDF and get key-concept flashcards generated instantly"
                    />
                    <FeatureCard
                        icon={<Trophy className="h-8 w-8 text-emerald-400" />}
                        title="Multi-Level Explanations"
                        description="Get beginner, intermediate, or advanced explanations of any topic"
                    />
                </div>
            </section>

            {/* Why Free Section */}
            <section className="container mx-auto px-4 my-16">
                <div className="relative max-w-4xl mx-auto rounded-3xl border border-edge bg-surface p-12 overflow-hidden">
                    <div className="pointer-events-none absolute -top-20 -right-20 h-[250px] w-[250px] rounded-full bg-purple-600/15 blur-[100px]" />
                    <div className="relative max-w-3xl mx-auto text-center space-y-4">
                        <Quote className="h-8 w-8 text-indigo-400 mx-auto" />
                        <h2 className="text-3xl md:text-4xl font-bold">Why Free?</h2>
                        <p className="text-lg text-ink-dim leading-relaxed">
                            Education should be accessible to everyone, regardless of financial background.
                            PadhAI-Dost is built by students who struggled with expensive tools, and we&apos;re
                            committed to keeping core features free forever.
                        </p>
                    </div>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-3xl mx-auto rounded-2xl border border-edge bg-surface p-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                        Built With
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
                        <TechBadge label="Next.js 16" />
                        <TechBadge label="TypeScript" />
                        <TechBadge label="Tailwind CSS" />
                        <TechBadge label="FastAPI" />
                        <TechBadge label="LangChain" />
                        <TechBadge label="Gemini 2.0" />
                        <TechBadge label="FAISS + BM25" />
                        <TechBadge label="Prisma + Postgres" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-edge py-8">
                <div className="container mx-auto px-4 text-center text-ink-faint">
                    <p>Built by students, for students</p>
                    <div className="flex justify-center gap-4 mt-4 text-sm">
                        <a
                            href="https://github.com/Abhics8/PadhAI-Dost"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            GitHub
                        </a>
                        <span className="text-edge-2">|</span>
                        <a
                            href="https://github.com/Abhics8/PadhAI-Dost/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Documentation
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="group p-6 rounded-2xl border border-edge bg-surface hover:bg-surface-2 hover:border-brand/40 hover:-translate-y-1 transition-all duration-300">
            <div className="mb-4 inline-flex rounded-xl bg-canvas border border-edge p-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-ink">{title}</h3>
            <p className="text-ink-dim text-sm leading-relaxed">{description}</p>
        </div>
    );
}

function TechBadge({ label }: { label: string }) {
    return (
        <div className="px-3 py-2.5 rounded-lg border border-edge bg-surface-2 font-medium text-ink-dim hover:text-ink hover:border-edge-2 transition-colors">
            {label}
        </div>
    );
}
