"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { formatViewCount, formatTimeAgo } from "@/lib/utils";
import { User, ThumbsUp, Share2, Clock, Loader2 } from "lucide-react";

interface VideoInfo {
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    channelId: string;
    channelName: string;
    channelAvatar: string | null;
    duration: number;
    viewCount: number;
    publishedAt: string | null;
    keywords: string[];
}

interface RelatedVideo {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    duration: number;
    viewCount: number;
}

export default function WatchPage() {
    const params = useParams();
    const videoId = params.videoId as string;

    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        const fetchVideoData = async () => {
            if (!videoId) return;

            try {
                setIsLoading(true);
                setError(null);

                // Fetch video info
                const infoResponse = await fetch(`/api/info?videoId=${videoId}`);
                if (!infoResponse.ok) {
                    throw new Error('Video không tồn tại hoặc bị hạn chế');
                }
                const info = await infoResponse.json();
                setVideoInfo(info);

                // Fetch related videos based on title keywords
                const searchQuery = info.title.split(' ').slice(0, 3).join(' ');
                const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    // Filter out current video
                    const related = searchData.videos?.filter((v: any) => v.videoId !== videoId) || [];
                    setRelatedVideos(related);
                }

            } catch (err: any) {
                console.error('Error fetching video:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideoData();
    }, [videoId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !videoInfo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] glass-card rounded-xl p-12">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Lỗi</h2>
                <p className="text-muted-foreground mb-6">{error || 'Không thể tải video'}</p>
                <a
                    href="/"
                    className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
                >
                    Về trang chủ
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
                {/* Video Player */}
                <VideoPlayer
                    videoId={videoId}
                    title={videoInfo.title}
                    thumbnail={videoInfo.thumbnail}
                    channelName={videoInfo.channelName}
                />

                {/* Video Info */}
                <div className="mt-4 glass-card rounded-xl p-4 md:p-6">
                    <h1 className="text-xl md:text-2xl font-bold mb-3">
                        {videoInfo.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span>{formatViewCount(videoInfo.viewCount)} lượt xem</span>
                        {videoInfo.publishedAt && (
                            <>
                                <span>•</span>
                                <span>{formatTimeAgo(new Date(videoInfo.publishedAt))}</span>
                            </>
                        )}
                    </div>

                    {/* Channel Info */}
                    <div className="flex items-center justify-between flex-wrap gap-4 py-4 border-y border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                {videoInfo.channelAvatar ? (
                                    <img
                                        src={videoInfo.channelAvatar}
                                        alt={videoInfo.channelName}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold">{videoInfo.channelName}</h3>
                                <p className="text-xs text-muted-foreground">Kênh YouTube</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm">Thích</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors">
                                <Share2 className="w-4 h-4" />
                                <span className="text-sm">Chia sẻ</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Lưu</span>
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    {videoInfo.description && (
                        <div className="mt-4">
                            <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''
                                }`}>
                                {videoInfo.description}
                            </p>
                            {videoInfo.description.length > 200 && (
                                <button
                                    onClick={() => setShowFullDescription(!showFullDescription)}
                                    className="mt-2 text-sm text-primary hover:underline"
                                >
                                    {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    {videoInfo.keywords && videoInfo.keywords.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {videoInfo.keywords.slice(0, 10).map((tag, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 rounded-full bg-white/5 text-xs text-muted-foreground"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar - Related Videos */}
            <aside className="lg:w-96 space-y-3">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Video liên quan
                </h3>

                {relatedVideos.length > 0 ? (
                    relatedVideos.map((video) => (
                        <VideoCard
                            key={video.videoId}
                            videoId={video.videoId}
                            title={video.title}
                            thumbnail={video.thumbnail}
                            channelName={video.channelName}
                            duration={video.duration}
                            viewCount={video.viewCount}
                            className="flex flex-row lg:flex-col"
                        />
                    ))
                ) : (
                    [...Array(5)].map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))
                )}
            </aside>
        </div>
    );
}
