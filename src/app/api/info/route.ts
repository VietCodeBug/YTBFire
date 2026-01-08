import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
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

    for (const options of attempts) {
        try {
            const info = await ytdl.getInfo(videoUrl, options);
            const videoDetails = info.videoDetails;

            const thumbnails = videoDetails.thumbnails || [];
            const thumbnail = thumbnails[thumbnails.length - 1]?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            const durationSeconds = parseInt(videoDetails.lengthSeconds, 10) || 0;
            const viewCount = parseInt(videoDetails.viewCount, 10) || 0;

            console.log(`[InfoAPI] Successfully fetched info for ${videoId}`);

            return NextResponse.json({
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
            });

        } catch (error: any) {
            console.error(`[InfoAPI] Attempt failed:`, error.message);
            lastError = error;
        }
    }

    if (lastError?.message?.includes('Video unavailable')) {
        return NextResponse.json({ error: 'Video not available' }, { status: 404 });
    }
    if (lastError?.message?.includes('Sign in')) {
        return NextResponse.json({ error: 'Age-restricted or private video' }, { status: 403 });
    }

    return NextResponse.json({ error: lastError?.message || 'Failed to fetch info' }, { status: 500 });
}
