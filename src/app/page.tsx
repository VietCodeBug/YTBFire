"use client";

import { useState, useEffect } from "react";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Flame, TrendingUp, Music2, Sparkles } from "lucide-react";

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

// Default trending keywords to fetch videos
const TRENDING_QUERIES = [
    "trending music 2026",
    "trending vietnam",
    "nhạc hot",
];

export default function HomePage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrendingVideos = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch from multiple queries for variety
                const randomQuery = TRENDING_QUERIES[Math.floor(Math.random() * TRENDING_QUERIES.length)];
                const response = await fetch(`/api/search?q=${encodeURIComponent(randomQuery)}&limit=24`);

                if (!response.ok) {
                    throw new Error('Failed to fetch videos');
                }

                const data = await response.json();
                setVideos(data.videos || []);
            } catch (err: any) {
                console.error('Error fetching videos:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrendingVideos();
    }, []);

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <section className="glass-card rounded-2xl p-6 md:p-8 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
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
                        <Music2 className="w-4 h-4 text-purple-400" />
                        <span>Chế độ Audio (~90% data)</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span>Streaming qua VPS</span>
                    </div>
                </div>
            </section>

            {/* Videos Section */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-semibold">Đề xuất cho bạn</h2>
                </div>

                {error && (
                    <div className="glass-card rounded-xl p-6 text-center text-red-400">
                        <p>Lỗi tải video: {error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isLoading ? (
                        // Skeleton loading
                        [...Array(12)].map((_, i) => (
                            <VideoCardSkeleton key={i} />
                        ))
                    ) : (
                        videos.map((video) => (
                            <VideoCard
                                key={video.videoId}
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

                {!isLoading && videos.length === 0 && !error && (
                    <div className="glass-card rounded-xl p-12 text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">Không có video nào</p>
                    </div>
                )}
            </section>
        </div>
    );
}
