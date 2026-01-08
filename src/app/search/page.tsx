"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Search, Filter, Loader2 } from "lucide-react";

interface Video {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    channelAvatar?: string;
    duration: number;
    viewCount: number;
    description?: string;
    uploadedAt?: string;
}

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';

    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalResults, setTotalResults] = useState(0);

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!query.trim()) {
                setVideos([]);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`);

                if (!response.ok) {
                    throw new Error('Lỗi tìm kiếm');
                }

                const data = await response.json();
                setVideos(data.videos || []);
                setTotalResults(data.totalResults || 0);
            } catch (err: any) {
                console.error('Search error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSearchResults();
    }, [query]);

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] glass-card rounded-xl p-12">
                <Search className="w-16 h-16 mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Tìm kiếm video</h2>
                <p className="text-muted-foreground text-center">
                    Nhập từ khóa vào thanh tìm kiếm để bắt đầu
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search Header */}
            <div className="glass-card rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-semibold mb-1">
                            Kết quả tìm kiếm cho "{query}"
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? 'Đang tìm...' : `Tìm thấy ${totalResults.toLocaleString()} kết quả`}
                        </p>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-colors">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">Bộ lọc</span>
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="glass-card rounded-xl p-6 text-center text-red-400">
                    <p>Lỗi: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Results Grid */}
            {!isLoading && !error && videos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {videos.map((video) => (
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
                    ))}
                </div>
            )}

            {/* No Results */}
            {!isLoading && !error && videos.length === 0 && query && (
                <div className="flex flex-col items-center justify-center min-h-[40vh] glass-card rounded-xl p-12">
                    <Search className="w-16 h-16 mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-semibold mb-2">Không tìm thấy kết quả</h2>
                    <p className="text-muted-foreground text-center">
                        Thử tìm kiếm với từ khóa khác
                    </p>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}
