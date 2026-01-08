"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Music2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";

const LOFI_QUERIES = [
    "lofi hip hop beats",
    "synthwave music",
    "chill study music",
    "ambient music work",
    "jazz lofi",
];

interface LofiVideo {
    videoId: string;
    title: string;
    thumbnail: string;
}

export default function FocusPage() {
    // Pomodoro State
    const [mode, setMode] = useState<"work" | "break">("work");
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState(0);

    // Music State
    const [lofiVideos, setLofiVideos] = useState<LofiVideo[]>([]);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoadingMusic, setIsLoadingMusic] = useState(true);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Timer settings
    const WORK_TIME = 25 * 60;
    const BREAK_TIME = 5 * 60;

    // Fetch Lofi music
    useEffect(() => {
        const fetchLofiMusic = async () => {
            try {
                const query = LOFI_QUERIES[Math.floor(Math.random() * LOFI_QUERIES.length)];
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
                const data = await response.json();
                setLofiVideos(data.videos || []);
            } catch (error) {
                console.error("Error fetching lofi:", error);
            } finally {
                setIsLoadingMusic(false);
            }
        };
        fetchLofiMusic();
    }, []);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Timer finished
            if (mode === "work") {
                setSessions((prev) => prev + 1);
                setMode("break");
                setTimeLeft(BREAK_TIME);
            } else {
                setMode("work");
                setTimeLeft(WORK_TIME);
            }
            setIsRunning(false);
            // Play notification sound
            new Audio("/notification.mp3").play().catch(() => { });
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, mode]);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Reset timer
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(mode === "work" ? WORK_TIME : BREAK_TIME);
    };

    // Progress percentage
    const progress = mode === "work"
        ? ((WORK_TIME - timeLeft) / WORK_TIME) * 100
        : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 p-4">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Focus Mode</h1>
                <p className="text-muted-foreground">Pomodoro Timer + Lofi Music để tập trung</p>
            </div>

            {/* Timer Card */}
            <div className="glass-card rounded-3xl p-8 md:p-12 w-full max-w-md relative overflow-hidden">
                {/* Progress Ring Background */}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent transition-all duration-1000"
                    style={{ height: `${progress}%`, top: 'auto' }}
                />

                {/* Mode Indicator */}
                <div className="relative flex items-center justify-center gap-2 mb-6">
                    {mode === "work" ? (
                        <>
                            <Brain className="w-6 h-6 text-orange-400" />
                            <span className="text-lg font-medium text-orange-400">Thời gian làm việc</span>
                        </>
                    ) : (
                        <>
                            <Coffee className="w-6 h-6 text-green-400" />
                            <span className="text-lg font-medium text-green-400">Thời gian nghỉ</span>
                        </>
                    )}
                </div>

                {/* Timer Display */}
                <div className="relative text-center mb-8">
                    <div className="text-7xl md:text-8xl font-bold tracking-tight">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        Phiên hoàn thành: {sessions}
                    </div>
                </div>

                {/* Controls */}
                <div className="relative flex items-center justify-center gap-4">
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-4 rounded-full transition-all ${isRunning
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                            }`}
                    >
                        {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </button>
                    <button
                        onClick={resetTimer}
                        className="p-4 rounded-full glass hover:bg-white/10 transition-colors"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </button>
                </div>

                {/* Mode Switcher */}
                <div className="relative flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => {
                            setMode("work");
                            setTimeLeft(WORK_TIME);
                            setIsRunning(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${mode === "work" ? "bg-orange-500/20 text-orange-400" : "hover:bg-white/10"
                            }`}
                    >
                        25 phút
                    </button>
                    <button
                        onClick={() => {
                            setMode("break");
                            setTimeLeft(BREAK_TIME);
                            setIsRunning(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${mode === "break" ? "bg-green-500/20 text-green-400" : "hover:bg-white/10"
                            }`}
                    >
                        5 phút nghỉ
                    </button>
                </div>
            </div>

            {/* Lofi Music Section */}
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Music2 className="w-5 h-5 text-orange-400" />
                        Nhạc Lofi
                    </h3>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                </div>

                {isLoadingMusic ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="aspect-video rounded-lg bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {lofiVideos.slice(0, 8).map((video, index) => (
                            <Link
                                key={video.videoId}
                                href={`/watch/${video.videoId}`}
                                className={`relative aspect-video rounded-lg overflow-hidden group ${currentTrack === index ? "ring-2 ring-orange-500" : ""
                                    }`}
                            >
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                <div className="absolute bottom-1 left-1 right-1">
                                    <p className="text-xs line-clamp-1">{video.title}</p>
                                </div>
                                {currentTrack === index && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="text-center text-sm text-muted-foreground max-w-md">
                <p>💡 <strong>Tip:</strong> Click vào một bài nhạc và bấm PiP để nghe nhạc trong khi code!</p>
            </div>
        </div>
    );
}
