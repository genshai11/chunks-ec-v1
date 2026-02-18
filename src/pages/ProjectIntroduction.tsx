import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Info, Coins, Target, Users, LayoutDashboard, Database, Trophy, Award, Clock, Code2, Cpu, Layers, Zap } from "lucide-react";
import { LearnerLayout } from "@/components/layout/LearnerLayout";

const ProjectIntroduction = () => {
    return (
        <LearnerLayout contentClassName="max-w-4xl">

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center lg:text-left"
                    >
                        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
                            Project Introduction <span className="text-primary">& Technical Documentation</span>
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Comprehensive overview of the Chunks Economy platform - from high-level vision to low-level implementation details.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Accordion type="single" collapsible className="w-full space-y-4">

                            <AccordionItem value="vision" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                            <LayoutDashboard className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Project Vision & Core Value</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-14">
                                    <p className="mb-4">
                                        <strong>CHUNKS Economy</strong> is an advanced language learning platform that focuses on "chunking" - breaking down language into manageable pieces for better retention and fluency.
                                    </p>
                                    <p>
                                        The core value proposition lies in its <strong>gamified economy system</strong>. Unlike traditional learning apps, Chunks directly ties learning progress to a virtual economy, ensuring that consistent practice is tangibly rewarded. By integrating rigorous audio analysis with immediate feedback and economic incentives, we create a loop of motivation and improvement.
                                    </p>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="tech-stack" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                            <Code2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Technology Stack</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-foreground">Frontend</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>â€¢ <strong>React 18.3</strong> - UI framework</li>
                                                <li>â€¢ <strong>TypeScript 5.8</strong> - Type safety</li>
                                                <li>â€¢ <strong>Vite 7.3</strong> - Build tool with SWC</li>
                                                <li>â€¢ <strong>Tailwind CSS 3.4</strong> - Styling</li>
                                                <li>â€¢ <strong>Framer Motion 12</strong> - Animations</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-foreground">UI Components</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>â€¢ <strong>Radix UI</strong> - Accessible primitives</li>
                                                <li>â€¢ <strong>shadcn/ui</strong> - Component library</li>
                                                <li>â€¢ <strong>Lucide React</strong> - Icon system</li>
                                                <li>â€¢ <strong>Recharts 2.15</strong> - Data visualization</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-foreground">State & Data</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>â€¢ <strong>TanStack Query 5</strong> - Server state</li>
                                                <li>â€¢ <strong>React Hook Form 7</strong> - Form handling</li>
                                                <li>â€¢ <strong>Zod 3.25</strong> - Schema validation</li>
                                                <li>â€¢ <strong>date-fns 3.6</strong> - Date utilities</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-foreground">Backend</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>â€¢ <strong>Supabase</strong> - PostgreSQL database</li>
                                                <li>â€¢ <strong>Row Level Security</strong> - Data isolation</li>
                                                <li>â€¢ <strong>Real-time subscriptions</strong></li>
                                                <li>â€¢ <strong>Edge Functions</strong> - Serverless API</li>
                                            </ul>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="audio-engine" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Audio Analysis Engine</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14 space-y-4">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Our proprietary audio analysis engine evaluates 5 core metrics using advanced DSP algorithms. All thresholds are configurable via the admin panel.
                                    </p>

                                    <div className="space-y-4">
                                        <div className="bg-background/50 p-4 rounded-lg border">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-semibold text-foreground">1. Volume/Energy Analysis</h5>
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">20% weight</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                <strong>Algorithm:</strong> RMS (Root Mean Square) calculation in decibels
                                            </p>
                                            <code className="text-xs bg-muted px-2 py-1 rounded block">
                                                dB = 20 * log10(rms / reference)
                                            </code>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Thresholds: -45dB (min) to -20dB (ideal)
                                            </p>
                                        </div>

                                        <div className="bg-background/50 p-4 rounded-lg border">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-semibold text-foreground">2. Speech Rate Detection</h5>
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">25% weight</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                <strong>3 Detection Methods:</strong>
                                            </p>
                                            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                                                <li>â€¢ <strong>Energy Peaks:</strong> Volume-compensated peak detection (default)</li>
                                                <li>â€¢ <strong>Zero-Crossing Rate:</strong> Frequency-based syllable counting</li>
                                                <li>â€¢ <strong>Deepgram STT:</strong> AI-powered word count via speech-to-text</li>
                                            </ul>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Output: Words per minute (WPM) â€¢ Target: 80-200 WPM
                                            </p>
                                        </div>

                                        <div className="bg-background/50 p-4 rounded-lg border">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-semibold text-foreground">3. Acceleration Analysis</h5>
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">15% weight</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Compares first half vs second half of audio to detect volume and rate changes. Rewards speakers who build energy throughout their response.
                                            </p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-background/50 p-4 rounded-lg border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-semibold text-foreground text-sm">4. Response Time</h5>
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">15%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Measures silence before speech begins. Ideal: &lt;500ms
                                                </p>
                                            </div>
                                            <div className="bg-background/50 p-4 rounded-lg border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-semibold text-foreground text-sm">5. Pause Management</h5>
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">15%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Counts and measures pauses &gt;200ms during speech
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
                                            <h5 className="font-semibold text-foreground mb-2">Overall Score Formula</h5>
                                            <code className="text-xs bg-background/80 px-3 py-2 rounded block font-mono">
                                                score = (volume Ã— 0.20) + (speechRate Ã— 0.25) + (acceleration Ã— 0.15) + (responseTime Ã— 0.15) + (pauses Ã— 0.15)
                                            </code>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="features" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                            <Database className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Core Features</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-background/50 border">
                                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                                <Award className="w-4 h-4 text-primary" /> Audio Recording & Analysis
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Real-time pitch, intensity, and formant analysis using MediaRecorder API with WAV encoding.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Tech:</strong> Web Audio API, AudioContext, AnalyserNode
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-background/50 border">
                                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboards
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Competitive rankings based on total coins earned and learning streaks.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Tech:</strong> PostgreSQL aggregations, real-time updates
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-background/50 border">
                                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                                <Target className="w-4 h-4 text-red-500" /> Practice Mode
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Interactive lessons with instant scoring (0-100%) and detailed feedback.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Analysis time:</strong> &lt;500ms per recording
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-background/50 border">
                                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-green-500" /> Class Management
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Teachers organize students, assign lessons, and track progress with detailed analytics.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Features:</strong> Bulk operations, deadline scheduling
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="economy" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Economy Logic & Algorithms</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14 space-y-4">
                                    <p className="text-muted-foreground mb-4">
                                        The coin economy uses sophisticated algorithms to reward quality practice and timely completion. All values are configurable via the admin panel.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">ðŸ’° Base Earnings (Score-Based)</h4>
                                            <div className="bg-background/50 p-3 rounded-lg border">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    Coins earned per practice are calculated from the audio analysis score:
                                                </p>
                                                <code className="text-xs bg-muted px-2 py-1 rounded block">
                                                    coins = (score / 100) * 15
                                                </code>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Range: 0-15 coins â€¢ Exponential scaling rewards higher accuracy
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">ðŸŽ¯ Milestone Bonuses</h4>
                                            <div className="bg-background/50 p-3 rounded-lg border">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    <strong>Algorithm:</strong> Triggered when lesson completion crosses thresholds
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>â€¢ 25% complete: <strong>+10 coins</strong></div>
                                                    <div>â€¢ 50% complete: <strong>+25 coins</strong></div>
                                                    <div>â€¢ 75% complete: <strong>+50 coins</strong></div>
                                                    <div>â€¢ 100% complete: <strong>+100 coins</strong></div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Total possible: 185 coins per lesson
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">ðŸ”¥ Streak Bonuses</h4>
                                            <div className="bg-background/50 p-3 rounded-lg border">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    <strong>Algorithm:</strong> Count consecutive scores â‰¥80 from recent practices
                                                </p>
                                                <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
                                                    bonus = (consecutive / threshold) * coinsPerStreak
                                                </code>
                                                <p className="text-xs text-muted-foreground">
                                                    Default: +5 coins per 3 consecutive high scores
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">âš¡ Deadline Rewards & Penalties</h4>
                                            <div className="bg-background/50 p-3 rounded-lg border space-y-2">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Early Completion Bonus:</p>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                                                        bonus = (daysEarly / maxDays) * 50
                                                    </code>
                                                    <p className="text-xs text-muted-foreground">Max: +50 coins (3+ days early)</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Late Penalty:</p>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                                                        penalty = (daysLate / 7) * 100 * (1 - completion%)
                                                    </code>
                                                    <p className="text-xs text-muted-foreground">Max: -100 coins (scaled by completion)</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">ðŸŽ First Practice Bonus</h4>
                                            <div className="bg-background/50 p-3 rounded-lg border">
                                                <p className="text-sm text-muted-foreground">
                                                    +2 coins for first attempt on any new item (encourages exploration)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="database" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Database Architecture</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14 space-y-4">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        PostgreSQL database via Supabase with Row Level Security (RLS) for multi-tenant isolation.
                                    </p>

                                    <div className="grid gap-3">
                                        <div className="bg-background/50 p-3 rounded-lg border">
                                            <h5 className="text-sm font-semibold text-foreground mb-1">Core Tables</h5>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                <li>â€¢ <code className="bg-muted px-1 rounded">users</code> - Authentication & profiles</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">courses</code> - Course definitions</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">course_classes</code> - Class instances with schedules</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">lessons</code> - Lesson content (JSONB categories)</li>
                                            </ul>
                                        </div>

                                        <div className="bg-background/50 p-3 rounded-lg border">
                                            <h5 className="text-sm font-semibold text-foreground mb-1">Practice & Progress</h5>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                <li>â€¢ <code className="bg-muted px-1 rounded">practice_history</code> - All attempts with scores & metrics</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">user_progress</code> - Aggregated progress per item</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">user_wallets</code> - Coin balances</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">coin_transactions</code> - Transaction log</li>
                                            </ul>
                                        </div>

                                        <div className="bg-background/50 p-3 rounded-lg border">
                                            <h5 className="text-sm font-semibold text-foreground mb-1">Configuration</h5>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                <li>â€¢ <code className="bg-muted px-1 rounded">coin_config</code> - Economy parameters (16 settings)</li>
                                                <li>â€¢ <code className="bg-muted px-1 rounded">scoring_config</code> - Audio analysis thresholds</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gradient-to-r from-cyan-500/5 to-cyan-500/10 p-3 rounded-lg border border-cyan-500/20">
                                            <h5 className="text-sm font-semibold text-foreground mb-2">Key Features</h5>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                <li>â€¢ <strong>Row Level Security:</strong> User data isolation via RLS policies</li>
                                                <li>â€¢ <strong>Real-time:</strong> Live updates via Supabase subscriptions</li>
                                                <li>â€¢ <strong>JSONB:</strong> Flexible lesson content storage</li>
                                                <li>â€¢ <strong>Indexes:</strong> Optimized queries on user_id, lesson_id</li>
                                            </ul>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="roles" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">User Roles & Permissions</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14">
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-base font-semibold text-foreground">Student (Learner)</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                The primary user type. Students can:
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-2">
                                                <li>Access assigned courses and lessons</li>
                                                <li>Practice audio chunks and receive instant feedback</li>
                                                <li>Earn coins and track progress</li>
                                                <li>View leaderboard standings</li>
                                            </ul>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                <strong>Permissions:</strong> Read own data, write practice records
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="text-base font-semibold text-foreground">Teacher (Admin)</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Advanced users with management capabilities. Teachers can:
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-2">
                                                <li>Create and manage courses, lessons, and classes</li>
                                                <li>Review student performance and analytics</li>
                                                <li>Configure economy settings (coin rewards, penalties)</li>
                                                <li>Adjust audio analysis weights and thresholds</li>
                                                <li>Manage user enrollments and permissions</li>
                                            </ul>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                <strong>Permissions:</strong> Full CRUD on courses, read all user data
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="deadlines" className="border rounded-xl px-4 bg-card/30">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-semibold">Deadline System Logic</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-14">
                                    <p className="text-muted-foreground mb-4">
                                        The deadline system uses dynamic calculation based on class schedules to create realistic time pressure.
                                    </p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="bg-background/50 p-4 rounded-lg border">
                                            <h5 className="font-semibold mb-2 text-foreground">Calculation Algorithm</h5>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Deadlines are auto-calculated using:
                                            </p>
                                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                                <li>Class start date</li>
                                                <li>Schedule days (e.g., Mon/Wed/Fri)</li>
                                                <li>Lesson order index</li>
                                            </ol>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                <strong>Library:</strong> date-fns for date calculations
                                            </p>
                                        </div>
                                        <div className="bg-background/50 p-4 rounded-lg border">
                                            <h5 className="font-semibold mb-2 text-foreground">Status States</h5>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    <span className="text-muted-foreground">Upcoming (&gt;3 days left)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                    <span className="text-muted-foreground">Due Soon (â‰¤3 days left)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    <span className="text-muted-foreground">Due Today</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    <span className="text-muted-foreground">Overdue</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </motion.div>
        </LearnerLayout>
    );
};

export default ProjectIntroduction;
