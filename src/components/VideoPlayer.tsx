"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Loader2, Play } from "lucide-react";

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

    const hasLoggedHistory = useRef(false);

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

    const handleStart = () => {
        setStarted(true);
        setIsLoading(true);
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden glass-card">
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
                            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/50">
                                <Play className="w-10 h-10 text-white ml-1" />
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <p className="text-white text-lg font-semibold line-clamp-2 drop-shadow-lg">{title}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Native HTML5 video with built-in controls */}
                        <video
                            src={streamUrl}
                            className="w-full h-full object-contain"
                            controls
                            autoPlay
                            controlsList="nodownload"
                            onLoadStart={() => setIsLoading(true)}
                            onCanPlay={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                        />

                        {/* Loading overlay */}
                        {isLoading && !hasError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 pointer-events-none">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <span className="text-white text-lg">Đang tải video...</span>
                                <span className="text-white/60 text-sm mt-2">Có thể mất 10-30 giây</span>
                            </div>
                        )}

                        {/* Error state */}
                        {hasError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                                <p className="text-red-400 text-lg mb-4">Video không khả dụng</p>
                                <a
                                    href={`https://www.youtube.com/watch?v=${videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Xem trên YouTube
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Note about seeking limitation */}
            {started && !hasError && (
                <div className="text-xs text-muted-foreground text-center bg-white/5 rounded-lg py-2 px-4">
                    ⚠️ Video streaming không hỗ trợ tua. Để tua, hãy đợi video tải xong một phần.
                </div>
            )}
        </div>
    );
}
