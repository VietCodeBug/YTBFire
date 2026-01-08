"use client";

import Link from "next/link";
import { cn, formatDuration, formatViewCount, formatTimeAgo } from "@/lib/utils";
import { getProxiedImageUrl } from "@/lib/imageProxy";

interface VideoCardProps {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    channelAvatar?: string;
    viewCount?: number;
    duration?: number;
    publishedAt?: Date | string;
    className?: string;
}

export function VideoCard({
    videoId,
    title,
    thumbnail,
    channelName,
    channelAvatar,
    viewCount,
    duration,
    publishedAt,
    className,
}: VideoCardProps) {
    // Proxy images to bypass firewall
    const proxiedThumbnail = getProxiedImageUrl(thumbnail);
    const proxiedAvatar = getProxiedImageUrl(channelAvatar);

    return (
        <Link
            href={`/watch/${videoId}`}
            className={cn(
                "group block rounded-xl overflow-hidden glass-card transition-all duration-300",
                className
            )}
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={proxiedThumbnail}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />

                {/* Duration Badge */}
                {duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-xs font-medium">
                        {formatDuration(duration)}
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play Icon on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                <div className="flex gap-3">
                    {/* Channel Avatar */}
                    <div className="flex-shrink-0">
                        {channelAvatar ? (
                            <img
                                src={proxiedAvatar}
                                alt={channelName}
                                className="w-9 h-9 rounded-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-sm font-bold text-white">
                                {channelName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                            {title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {channelName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            {viewCount && (
                                <>
                                    <span>{formatViewCount(viewCount)} lượt xem</span>
                                    <span>•</span>
                                </>
                            )}
                            {publishedAt && (
                                <span>{formatTimeAgo(new Date(publishedAt))}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Skeleton loading state
export function VideoCardSkeleton() {
    return (
        <div className="rounded-xl overflow-hidden glass-card animate-pulse">
            <div className="aspect-video bg-white/5" />
            <div className="p-3">
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded w-full" />
                        <div className="h-3 bg-white/5 rounded w-2/3" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                </div>
            </div>
        </div>
    );
}
