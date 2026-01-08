"use client";

import Link from "next/link";
import { formatDuration, formatViewCount } from "@/lib/utils";

interface RelatedVideoCardProps {
    videoId: string;
    title: string;
    thumbnail: string;
    channelName: string;
    duration?: number;
    viewCount?: number;
}

export function RelatedVideoCard({
    videoId,
    title,
    thumbnail,
    channelName,
    duration,
    viewCount,
}: RelatedVideoCardProps) {
    return (
        <Link
            href={`/watch/${videoId}`}
            className="flex gap-3 group hover:bg-white/5 rounded-lg p-2 transition-colors"
        >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden">
                <img
                    src={thumbnail || `/api/placeholder/160/90`}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Duration Badge */}
                {duration && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-xs font-medium">
                        {formatDuration(duration)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                    {title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {channelName}
                </p>
                {viewCount && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {formatViewCount(viewCount)} lượt xem
                    </p>
                )}
            </div>
        </Link>
    );
}

export function RelatedVideoSkeleton() {
    return (
        <div className="flex gap-3 p-2 animate-pulse">
            <div className="flex-shrink-0 w-40 aspect-video rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
            </div>
        </div>
    );
}
