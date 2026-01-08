"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { cn, formatDuration } from "@/lib/utils";
import {
    Loader2, Play, Pause, Volume2, VolumeX,
    Maximize, SkipBack, SkipForward
} from "lucide-react";

interface VideoPlayerProps {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    className?: string;
}

export function VideoPlayer({
    videoId,
    title,
    thumbnail,
    channelName,
    className,
}: VideoPlayerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [started, setStarted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const hasLoggedHistory = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeout = useRef<NodeJS.Timeout>();

    const streamUrl = `/api/stream?videoId=${videoId}&type=video`;

    // Auto-save history after 5 seconds
    useEffect(() => {
        if (!started) return;

        const timer = setTimeout(async () => {
            if (auth.currentUser && !hasLoggedHistory.current) {
                try {
                    const historyRef = doc(db, "users", auth.currentUser.uid, "history", videoId);
                    await setDoc(historyRef, {
                        videoId,
                        title,
                        thumbnail,
                        channelName,
                        lastViewedAt: serverTimestamp(),
                        type: 'video'
                    }, { merge: true });

                    hasLoggedHistory.current = true;
                } catch (error) {
                    console.error("Lỗi lưu history:", error);
                }
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [started, videoId, title, thumbnail, channelName]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!started) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    video.currentTime = Math.min(duration, video.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    setVolume(video.volume);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    setVolume(video.volume);
                    break;
                case 'KeyM':
                    video.muted = !video.muted;
                    setIsMuted(video.muted);
                    break;
                case 'KeyF':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        containerRef.current?.requestFullscreen();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [started, duration]);

    // Show/hide controls
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeout.current) {
            clearTimeout(controlsTimeout.current);
        }
        controlsTimeout.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    }, [isPlaying]);

    const handleStart = () => {
        setStarted(true);
        setIsLoading(true);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (video) {
            video.currentTime = parseFloat(e.target.value);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (video) {
            const newVolume = parseFloat(e.target.value);
            video.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
        }
    };

    const skip = (seconds: number) => {
        const video = videoRef.current;
        if (video) {
            video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
        }
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={cn("space-y-4", className)}>
            <div
                ref={containerRef}
                className="relative aspect-video bg-black rounded-xl overflow-hidden glass-card"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                {!started ? (
                    // Thumbnail with play button
                    <div
                        className="absolute inset-0 cursor-pointer group"
                        onClick={handleStart}
                    >
                        <img
                            src={`/api/image?url=${encodeURIComponent(thumbnail)}`}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-10 h-10 text-white ml-1" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            src={streamUrl}
                            className="w-full h-full object-contain"
                            autoPlay
                            onClick={togglePlay}
                            onLoadStart={() => setIsLoading(true)}
                            onCanPlay={() => setIsLoading(false)}
                            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                        />

                        {/* Loading overlay */}
                        {isLoading && !hasError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                <span className="ml-3 text-white">Đang tải video...</span>
                            </div>
                        )}

                        {/* Error state */}
                        {hasError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                                <p className="text-red-400 mb-4">Video không khả dụng</p>
                                <a
                                    href={`https://www.youtube.com/watch?v=${videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Xem trên YouTube
                                </a>
                            </div>
                        )}

                        {/* Custom Controls */}
                        <div
                            className={cn(
                                "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-12",
                                "transition-opacity duration-300",
                                showControls ? "opacity-100" : "opacity-0"
                            )}
                        >
                            {/* Progress Bar */}
                            <div className="mb-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                                        [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                                    style={{
                                        background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
                                    }}
                                />
                            </div>

                            {/* Control Buttons */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {/* Skip Back */}
                                    <button
                                        onClick={() => skip(-10)}
                                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                        title="Tua lại 10s (←)"
                                    >
                                        <SkipBack className="w-5 h-5" />
                                    </button>

                                    {/* Play/Pause */}
                                    <button
                                        onClick={togglePlay}
                                        className="p-3 rounded-full bg-primary/90 hover:bg-primary transition-colors"
                                        title="Play/Pause (Space)"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-6 h-6" />
                                        ) : (
                                            <Play className="w-6 h-6 ml-0.5" />
                                        )}
                                    </button>

                                    {/* Skip Forward */}
                                    <button
                                        onClick={() => skip(10)}
                                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                        title="Tua tới 10s (→)"
                                    >
                                        <SkipForward className="w-5 h-5" />
                                    </button>

                                    {/* Time Display */}
                                    <span className="text-sm ml-2 text-white">
                                        {formatDuration(currentTime)} / {formatDuration(duration)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Volume */}
                                    <div className="flex items-center gap-2 group">
                                        <button
                                            onClick={toggleMute}
                                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                            title="Tắt/Bật tiếng (M)"
                                        >
                                            {isMuted || volume === 0 ? (
                                                <VolumeX className="w-5 h-5" />
                                            ) : (
                                                <Volume2 className="w-5 h-5" />
                                            )}
                                        </button>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className="w-0 group-hover:w-20 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                                        />
                                    </div>

                                    {/* Fullscreen */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                        title="Toàn màn hình (F)"
                                    >
                                        <Maximize className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Keyboard shortcuts hint */}
            {started && (
                <div className="text-xs text-muted-foreground text-center">
                    ⌨️ Space: Play/Pause | ← →: Tua 10s | ↑ ↓: Âm lượng | M: Mute | F: Fullscreen
                </div>
            )}
        </div>
    );
}
