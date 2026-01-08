
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

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
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');

    try {
        // Use yt-dlp through proxychains with cookies
        // -f b: best pre-merged format (avoids warning)
        // --cookies: use cookies for authentication
        const format = type === 'audio' ? 'bestaudio' : 'b';

        const command = `proxychains4 -q yt-dlp --cookies "${cookiesPath}" -f "${format}" -g "${videoUrl}"`;

        console.log(`[StreamAPI] Running yt-dlp for ${videoId}`);

        const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

        const streamUrl = stdout.trim().split('\n')[0];

        if (!streamUrl || !streamUrl.startsWith('http')) {
            console.error('[StreamAPI] Invalid stream URL:', streamUrl);
            return new NextResponse('Failed to get stream URL', { status: 503 });
        }

        console.log(`[StreamAPI] Got stream URL for ${videoId}`);

        // Check if it's an HLS stream (m3u8) or direct URL
        if (streamUrl.includes('.m3u8') || streamUrl.includes('manifest')) {
            // For HLS, redirect to the stream URL directly
            // Browser's video player can handle HLS natively or with hls.js
            return NextResponse.redirect(streamUrl);
        }

        // For direct URLs, proxy the stream
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
