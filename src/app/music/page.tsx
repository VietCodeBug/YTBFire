"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Music2 } from "lucide-react";

interface Video {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    channelAvatar?: string;
    duration: number;
    viewCount: number;
    uploadedAt?: string;
}

const QUERIES = [
    "nhạc hot 2026",
    "vpop trending",
    "kpop music video",
    "nhạc remix hay nhất",
    "EDM mix 2026",
    "acoustic cover",
];

export default function MusicPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const fetchVideos = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (pageNum === 0) setIsLoading(true);
            else setIsLoadingMore(true);

            const query = QUERIES[pageNum % QUERIES.length];
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=16`);
            const data = await response.json();
            const newVideos = data.videos || [];

            if (newVideos.length === 0) {
                setHasMore(false);
            } else {
                setVideos(prev => append ? [...prev, ...newVideos] : newVideos);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos(0, false);
    }, [fetchVideos]);

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchVideos(nextPage, true);
            }
        }, { threshold: 0.1 });

        if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, isLoading, isLoadingMore, page, fetchVideos]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                    <Music2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Âm nhạc</h1>
                    <p className="text-sm text-muted-foreground">Nhạc hot, MV mới nhất</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? (
                    [...Array(16)].map((_, i) => <VideoCardSkeleton key={i} />)
                ) : (
                    videos.map((video, i) => (
                        <VideoCard key={`${video.videoId}-${i}`} {...video} />
                    ))
                )}
            </div>

            {isLoadingMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            )}

            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {hasMore && !isLoading && <span className="text-muted-foreground text-sm">Đang tải...</span>}
            </div>
        </div>
    );
}
