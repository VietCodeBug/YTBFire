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
    const videoRef = useRef<HTMLVideoElement>(null);

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
                    console.log("✅ Đã lưu lịch sử xem!");
                } catch (error) {
                    console.error("❌ Lỗi lưu history:", error);
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
                            controls
                            autoPlay
                            onLoadStart={() => setIsLoading(true)}
                            onCanPlay={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                        />

                        {isLoading && !hasError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                <span className="ml-3 text-white">Đang tải video...</span>
                            </div>
                        )}

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
                    </>
                )}
            </div>
        </div>
    );
}
