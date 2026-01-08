
import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import ytsr from 'ytsr'; // Use ytsr as fallback
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function loadCookies(): ytdl.Cookie[] | undefined {
    try {
        const cookiePath = path.join(process.cwd(), 'cookies.txt');
        if (fs.existsSync(cookiePath)) {
            const content = fs.readFileSync(cookiePath, 'utf-8');
            const cookies: ytdl.Cookie[] = [];

            for (const line of content.split('\n')) {
                if (line.startsWith('#') || !line.trim()) continue;
                const parts = line.split('\t');
                if (parts.length >= 7) {
                    cookies.push({
                        domain: parts[0],
                        name: parts[5],
                        value: parts[6].trim(),
                        path: parts[2],
                        secure: parts[3] === 'TRUE',
                        httpOnly: false,
                        expirationDate: parseInt(parts[4]) || undefined,
                    });
                }
            }
            if (cookies.length > 0) return cookies;
        }
    } catch (error) {
        console.error('Error loading cookies:', error);
    }
    return undefined;
}

const cookies = loadCookies();
const agent = cookies ? ytdl.createAgent(cookies) : undefined;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return NextResponse.json({ error: 'Invalid videoId format' }, { status: 400 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Mimic real browser headers
    const requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/',
        }
    };

    const attempts = agent
        ? [{ agent, requestOptions }, { requestOptions }]
        : [{ requestOptions }];

    let lastError;

    // Strategy 1: Try ytdl-core (Authenticated + Headers)
    for (const options of attempts) {
        try {
            const info = await ytdl.getInfo(videoUrl, options);
            const videoDetails = info.videoDetails;

            console.log(`[InfoAPI] Successfully fetched info for ${videoId} using ytdl-core`);

            return NextResponse.json(formatYtdlResponse(videoDetails));

        } catch (error: any) {
            console.error(`[InfoAPI] ytdl attempt failed:`, error.message);
            lastError = error;
        }
    }

    // Strategy 2: Fallback to ytsr (Search scraping) if ytdl fails (often works for public videos when API is blocked)
    console.log(`[InfoAPI] Falling back to ytsr scraping for ${videoId}`);
    try {
        // Search specifically for the video ID to simulate a direct lookup
        const filters = await ytsr.getFilters(videoId);
        const filter = filters.get('Type')?.get('Video');
        const url = filter?.url || videoUrl; // Use specific filter url if available

        const searchResults = await ytsr(url, { limit: 1 });
        const item = searchResults.items.find((i): i is ytsr.Video => i.type === 'video' && i.id === videoId);

        if (item) {
            console.log(`[InfoAPI] Successfully fetched info for ${videoId} using ytsr fallback`);
            return NextResponse.json({
                videoId: item.id,
                title: item.title,
                description: item.description || '',
                thumbnail: item.bestThumbnail?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                channelId: item.author?.channelID || 'Unknown',
                channelName: item.author?.name || 'Unknown',
                channelAvatar: item.author?.bestAvatar?.url || null,
                duration: parseDuration(item.duration),
                viewCount: item.views || 0,
                publishedAt: item.uploadedAt || null,
                keywords: [],
                category: null,
                isLive: item.isLive,
            });
        }
    } catch (fallbackError) {
        console.error(`[InfoAPI] Fallback scraping failed:`, fallbackError);
    }

    // Error handling
    if (lastError?.message?.includes('Video unavailable')) {
        return NextResponse.json({ error: 'Video not available' }, { status: 404 });
    }
    if (lastError?.message?.includes('Sign in')) {
        return NextResponse.json({ error: 'Age-restricted or private video' }, { status: 403 });
    }

    return NextResponse.json({ error: lastError?.message || 'Failed to fetch info' }, { status: 500 });
}

function formatYtdlResponse(videoDetails: any) {
    const thumbnails = videoDetails.thumbnails || [];
    const thumbnail = thumbnails[thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${videoDetails.videoId}/hqdefault.jpg`;

    const durationSeconds = parseInt(videoDetails.lengthSeconds, 10) || 0;
    const viewCount = parseInt(videoDetails.viewCount, 10) || 0;

    return {
        videoId: videoDetails.videoId,
        title: videoDetails.title,
        description: videoDetails.description || '',
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
    };
}

function parseDuration(duration: string | null): number {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}
