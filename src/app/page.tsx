"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Flame, TrendingUp, Music2, Sparkles, Gamepad2, Newspaper, Tv } from "lucide-react";
import Link from "next/link";

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

// Categories for variety
const CATEGORIES = [
    { id: 'all', label: 'Tất cả', icon: Sparkles, query: 'trending vietnam 2026' },
    { id: 'music', label: 'Âm nhạc', icon: Music2, query: 'nhạc hot trending' },
    { id: 'gaming', label: 'Trò chơi', icon: Gamepad2, query: 'game highlights' },
    { id: 'news', label: 'Tin tức', icon: Newspaper, query: 'tin tức mới nhất' },
    { id: 'entertainment', label: 'Giải trí', icon: Tv, query: 'giải trí vui nhộn' },
];

export default function HomePage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Fetch videos
    const fetchVideos = useCallback(async (category: string, pageNum: number, append: boolean = false) => {
        try {
            if (pageNum === 0) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }
            setError(null);

            const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
            // Add page variation to query
            const queries = [
                cat.query,
                `${cat.query} 2026`,
                `${cat.query} mới nhất`,
                `${cat.query} hot`,
                `${cat.query} hay nhất`,
            ];
            const query = queries[pageNum % queries.length];

            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12`);

            if (!response.ok) {
                throw new Error('Failed to fetch videos');
            }

            const data = await response.json();
            const newVideos = data.videos || [];

            if (newVideos.length === 0) {
                setHasMore(false);
            } else {
                if (append) {
                    setVideos(prev => [...prev, ...newVideos]);
                } else {
                    setVideos(newVideos);
                }
            }
        } catch (err: any) {
            console.error('Error fetching videos:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setVideos([]);
        fetchVideos(activeCategory, 0, false);
    }, [activeCategory, fetchVideos]);

    // Infinite scroll observer
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchVideos(activeCategory, nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, isLoading, isLoadingMore, page, activeCategory, fetchVideos]);

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <section className="glass-card rounded-2xl p-6 bg-gradient-to-r from-orange-900/20 via-amber-900/10 to-orange-900/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                            Chào mừng đến IanTube
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Xem video không quảng cáo, tiết kiệm bandwidth
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span>Không quảng cáo</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm">
                        <Music2 className="w-4 h-4 text-amber-400" />
                        <span>Chế độ Audio (~90% data)</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span>Streaming qua VPS</span>
                    </div>
                </div>
            </section>

            {/* Category Tabs */}
            <section className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'glass hover:bg-white/10 text-muted-foreground hover:text-white'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{cat.label}</span>
                        </button>
                    );
                })}
            </section>

            {/* Error State */}
            {error && (
                <div className="glass-card rounded-xl p-6 text-center text-red-400">
                    <p>Lỗi tải video: {error}</p>
                    <button
                        onClick={() => fetchVideos(activeCategory, 0, false)}
                        className="mt-4 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Videos Grid */}
            <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isLoading ? (
                        [...Array(12)].map((_, i) => <VideoCardSkeleton key={i} />)
                    ) : (
                        videos.map((video, index) => (
                            <VideoCard
                                key={`${video.videoId}-${index}`}
                                videoId={video.videoId}
                                title={video.title}
                                thumbnail={video.thumbnail}
                                channelName={video.channelName}
                                channelAvatar={video.channelAvatar}
                                duration={video.duration}
                                viewCount={video.viewCount}
                                publishedAt={video.uploadedAt}
                            />
                        ))
                    )}
                </div>

                {/* Loading More */}
                {isLoadingMore && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                        {[...Array(4)].map((_, i) => <VideoCardSkeleton key={i} />)}
                    </div>
                )}

                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                    {hasMore && !isLoading && !error && (
                        <div className="text-muted-foreground text-sm">Đang tải thêm...</div>
                    )}
                    {!hasMore && videos.length > 0 && (
                        <div className="text-muted-foreground text-sm">Đã hết video</div>
                    )}
                </div>
            </section>
        </div>
    );
}
