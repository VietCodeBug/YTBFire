"use client";

import { useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

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
    const hasLoggedHistory = useRef(false);

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
    }, [videoId, title, thumbnail, channelName]);

    return (
        <div className={cn("space-y-4", className)}>
            {/* YouTube Embed Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden glass-card">
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title={title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
