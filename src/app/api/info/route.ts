import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    // Validate videoId format
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return NextResponse.json({ error: 'Invalid videoId format' }, { status: 400 });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(videoUrl);
        const videoDetails = info.videoDetails;

        // Get best thumbnail
        const thumbnails = videoDetails.thumbnails || [];
        const thumbnail = thumbnails[thumbnails.length - 1]?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        // Parse duration
        const durationSeconds = parseInt(videoDetails.lengthSeconds, 10) || 0;

        // Parse view count
        const viewCount = parseInt(videoDetails.viewCount, 10) || 0;

        return NextResponse.json({
            videoId: videoDetails.videoId,
            title: videoDetails.title,
            description: videoDetails.shortDescription || videoDetails.description || '',
            thumbnail,
            channelId: videoDetails.channelId,
            channelName: videoDetails.author?.name || videoDetails.ownerChannelName || 'Unknown',
            channelAvatar: videoDetails.author?.thumbnails?.[0]?.url || null,
            duration: durationSeconds,
            viewCount,
            publishedAt: videoDetails.publishDate || null,
            keywords: videoDetails.keywords || [],
            category: videoDetails.category || null,
            isLive: videoDetails.isLiveContent || false,
        });

    } catch (error: any) {
        console.error('Info API Error:', error);

        if (error.message?.includes('Video unavailable')) {
            return NextResponse.json({ error: 'Video not available' }, { status: 404 });
        }
        if (error.message?.includes('Sign in')) {
            return NextResponse.json({ error: 'Age-restricted or private video' }, { status: 403 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
