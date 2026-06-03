import { Button } from "@/components/ui/auth-components";
import { ArrowRight, BookOpen, Brain, Trophy, Sparkles, Github, Star } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="text-center space-y-6 max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        PadhAI-Dost
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
                        Your AI-powered study companion. Upload. Ask. Learn.
                    </p>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
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
                            <Button className="text-lg px-8 h-12 bg-white text-black border border-gray-300 hover:bg-gray-50">
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

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard
                        icon={<Brain className="h-8 w-8 text-blue-600" />}
                        title="AI Tutoring"
                        description="Chat with your documents and get answers grounded in your source material"
                    />
                    <FeatureCard
                        icon={<BookOpen className="h-8 w-8 text-purple-600" />}
                        title="Smart Practice"
                        description="Auto-generated questions using Bloom's Taxonomy with adjustable difficulty"
                    />
                    <FeatureCard
                        icon={<Sparkles className="h-8 w-8 text-amber-600" />}
                        title="Auto Flashcards"
                        description="Upload a PDF and get key-concept flashcards generated instantly"
                    />
                    <FeatureCard
                        icon={<Trophy className="h-8 w-8 text-green-600" />}
                        title="Multi-Level Explanations"
                        description="Get beginner, intermediate, or advanced explanations of any topic"
                    />
                </div>
            </section>

            {/* Why Free Section */}
            <section className="container mx-auto px-4 py-16 bg-blue-50 dark:bg-gray-800 rounded-lg my-16">
                <div className="max-w-3xl mx-auto text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold">Why Free?</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Education should be accessible to everyone, regardless of financial background.
                        PadhAI-Dost is built by students who struggled with expensive tools, and we&apos;re
                        committed to keeping core features free forever.
                    </p>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                        Built With
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                        <TechBadge label="Next.js 16" />
                        <TechBadge label="TypeScript" />
                        <TechBadge label="Tailwind CSS" />
                        <TechBadge label="FastAPI" />
                        <TechBadge label="LangChain" />
                        <TechBadge label="Gemini 2.0" />
                        <TechBadge label="FAISS" />
                        <TechBadge label="Prisma + SQLite" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-gray-50 dark:bg-gray-900 py-8">
                <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
                    <p>Built by students, for students</p>
                    <div className="flex justify-center gap-4 mt-4">
                        <a
                            href="https://github.com/Abhics8/PadhAI-Dost"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            GitHub
                        </a>
                        <span>|</span>
                        <a
                            href="https://github.com/Abhics8/PadhAI-Dost/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    );
}

function TechBadge({ label }: { label: string }) {
    return (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300">
            {label}
        </div>
    );
}
