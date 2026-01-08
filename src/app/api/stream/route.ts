
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const type = searchParams.get('type') || 'video';

    if (!videoId) {
        return new NextResponse('Missing videoId parameter', { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return new NextResponse('Invalid videoId format', { status: 400 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Use yt-dlp through proxychains to get stream URL
        // -f 18: 360p mp4 (video+audio)
        // -f 22: 720p mp4 (video+audio) 
        // -f bestaudio: best audio only
        const format = type === 'audio' ? 'bestaudio' : '18/22/best[ext=mp4]';

        const command = `proxychains4 -q yt-dlp -f "${format}" -g "${videoUrl}" 2>/dev/null`;

        console.log(`[StreamAPI] Running: yt-dlp for ${videoId}`);

        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

        const streamUrl = stdout.trim().split('\n')[0];

        if (!streamUrl || !streamUrl.startsWith('http')) {
            console.error('[StreamAPI] Invalid stream URL:', streamUrl);
            return new NextResponse('Failed to get stream URL', { status: 503 });
        }

        console.log(`[StreamAPI] Got stream URL for ${videoId}`);

        // Fetch the actual stream and proxy it
        const streamResponse = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.youtube.com/',
            }
        });

        if (!streamResponse.ok || !streamResponse.body) {
            console.error('[StreamAPI] Failed to fetch stream:', streamResponse.status);
            return new NextResponse('Failed to fetch stream', { status: 503 });
        }

        const headers = new Headers();
        headers.set('Content-Type', type === 'audio' ? 'audio/webm' : 'video/mp4');
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'no-cache');

        const contentLength = streamResponse.headers.get('content-length');
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }

        return new Response(streamResponse.body, {
            headers,
            status: 200
        });

    } catch (error: any) {
        console.error('[StreamAPI] Error:', error.message);
        return new NextResponse('Video not available', { status: 503 });
    }
}
