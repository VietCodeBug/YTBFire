"use client";

import { useState, useRef, useEffect } from "react";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Music,
    Video,
    SkipBack,
    SkipForward,
    Loader2
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
    const [isAudioMode, setIsAudioMode] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasLoggedHistory = useRef(false);
    const controlsTimeout = useRef<NodeJS.Timeout>();

    const streamUrl = `/api/stream?videoId=${videoId}&type=${isAudioMode ? 'audio' : 'video'}`;
    const mediaRef = isAudioMode ? audioRef : videoRef;

    // Auto-save history after 5 seconds
    useEffect(() => {
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
                        type: isAudioMode ? 'audio' : 'video'
                    }, { merge: true });

                    hasLoggedHistory.current = true;
                    console.log("✅ Đã lưu lịch sử xem!");
                } catch (error) {
                    console.error("❌ Lỗi lưu history:", error);
                }
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [videoId, isAudioMode, title, thumbnail, channelName]);

    // Handle play/pause
    const togglePlay = () => {
        const media = mediaRef.current;
        if (!media) return;

        if (isPlaying) {
            media.pause();
        } else {
            media.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Handle volume
    const toggleMute = () => {
        const media = mediaRef.current;
        if (!media) return;

        media.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        const media = mediaRef.current;
        if (media) {
            media.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    // Handle seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        const media = mediaRef.current;
        if (media) {
            media.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    // Handle fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Media event handlers
    const handleTimeUpdate = () => {
        const media = mediaRef.current;
        if (media) {
            setCurrentTime(media.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        const media = mediaRef.current;
        if (media) {
            setDuration(media.duration);
            setIsLoading(false);
        }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    // Show/hide controls on hover
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeout.current) {
            clearTimeout(controlsTimeout.current);
        }
        controlsTimeout.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    // Skip forward/backward
    const skip = (seconds: number) => {
        const media = mediaRef.current;
        if (media) {
            media.currentTime = Math.max(0, Math.min(duration, media.currentTime + seconds));
        }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Chế độ phát:</span>
                    <div className="flex items-center gap-2 p-1 rounded-lg bg-white/5">
                        <button
                            onClick={() => setIsAudioMode(false)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                !isAudioMode
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Video className="w-4 h-4" />
                            Video
                        </button>
                        <button
                            onClick={() => setIsAudioMode(true)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                isAudioMode
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Music className="w-4 h-4" />
                            Audio
                        </button>
                    </div>
                </div>
                <span className="text-xs text-muted-foreground">
                    {isAudioMode ? "🎵 Tiết kiệm data ~90%" : "📹 Chất lượng cao"}
                </span>
            </div>

            {/* Player Container */}
            <div
                ref={containerRef}
                className="relative aspect-video bg-black rounded-xl overflow-hidden glass-card"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                {isAudioMode ? (
                    /* Audio Mode UI - Spinning Disc */
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                        {/* Spinning Disc */}
                        <div className="relative mb-8">
                            <div
                                className={cn(
                                    "w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl",
                                    "disc-spin",
                                    isPlaying && "playing"
                                )}
                            >
                                <img
                                    src={thumbnail}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                />
                                {/* Center hole */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-black border-2 border-white/20" />
                                </div>
                            </div>
                            {/* Glow effect */}
                            <div className="absolute -inset-4 rounded-full bg-purple-500/20 blur-xl -z-10 animate-pulse-glow" />
                        </div>

                        {/* Audio Visualizer Bars */}
                        <div className="flex items-end gap-1 h-12 mt-4">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-2 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full audio-bar",
                                        !isPlaying && "!h-2"
                                    )}
                                    style={{
                                        height: isPlaying ? `${20 + Math.random() * 80}%` : '8px',
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Hidden Audio Element */}
                        <audio
                            ref={audioRef}
                            src={streamUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onWaiting={handleWaiting}
                            onCanPlay={handleCanPlay}
                            onEnded={() => setIsPlaying(false)}
                        />
                    </div>
                ) : (
                    /* Video Mode */
                    <video
                        ref={videoRef}
                        src={streamUrl}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onWaiting={handleWaiting}
                        onCanPlay={handleCanPlay}
                        onEnded={() => setIsPlaying(false)}
                        onClick={togglePlay}
                    />
                )}

                {/* Loading Spinner */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                )}

                {/* Controls Overlay */}
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent",
                        "transition-opacity duration-300",
                        showControls ? "opacity-100" : "opacity-0"
                    )}
                >
                    {/* Progress Bar */}
                    <div className="px-4 mb-2">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                            style={{
                                background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
                            }}
                        />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between px-4 pb-4">
                        <div className="flex items-center gap-2">
                            {/* Skip Back */}
                            <button
                                onClick={() => skip(-10)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>

                            {/* Play/Pause */}
                            <button
                                onClick={togglePlay}
                                className="p-3 rounded-full bg-primary/90 hover:bg-primary transition-colors"
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
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>

                            {/* Time Display */}
                            <span className="text-sm ml-2">
                                {formatDuration(currentTime)} / {formatDuration(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Volume */}
                            <div className="flex items-center gap-2 group">
                                <button
                                    onClick={toggleMute}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
                            >
                                {isFullscreen ? (
                                    <Minimize className="w-5 h-5" />
                                ) : (
                                    <Maximize className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
