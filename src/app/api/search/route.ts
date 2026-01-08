import { NextRequest, NextResponse } from 'next/server';
import ytsr from 'ytsr';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
        return NextResponse.json({ error: 'Missing search query (q) parameter' }, { status: 400 });
    }

    try {
        // Search YouTube
        const searchResults = await ytsr(query, {
            limit: Math.min(limit, 50), // Cap at 50 results
            safeSearch: false
        });

        // Filter and format video results
        const videos = searchResults.items
            .filter((item): item is ytsr.Video => item.type === 'video')
            .map((video) => ({
                videoId: video.id,
                title: video.title,
                thumbnail: video.bestThumbnail?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
                channelName: video.author?.name || 'Unknown',
                channelId: video.author?.channelID || null,
                channelAvatar: video.author?.bestAvatar?.url || null,
                duration: parseDuration(video.duration || '0:00'),
                durationText: video.duration || '0:00',
                viewCount: parseViewCount(video.views || '0'),
                viewCountText: video.views || '0 views',
                uploadedAt: video.uploadedAt || null,
                description: video.description || '',
                isLive: video.isLive || false,
            }));

        return NextResponse.json({
            query,
            totalResults: searchResults.results || videos.length,
            videos,
        });

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Parse duration string (e.g., "12:34" or "1:23:45") to seconds
function parseDuration(duration: string | null): number {
    if (!duration) return 0;

    const parts = duration.split(':').map(Number);

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    }

    return 0;
}

// Parse view count string (e.g., "1.2M views") to number
function parseViewCount(views: string | null): number {
    if (!views) return 0;

    const cleaned = views.replace(/[^0-9.KMB]/gi, '');
    const num = parseFloat(cleaned);

    if (isNaN(num)) return 0;

    if (cleaned.includes('B') || cleaned.includes('b')) {
        return num * 1000000000;
    }
    if (cleaned.includes('M') || cleaned.includes('m')) {
        return num * 1000000;
    }
    if (cleaned.includes('K') || cleaned.includes('k')) {
        return num * 1000;
    }

    return Math.floor(num);
}
