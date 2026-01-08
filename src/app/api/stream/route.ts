
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
        // Format 18: 360p MP4 with audio (progressive, not HLS)
        // Format 140: audio only m4a
        const format = type === 'audio' ? '140' : '18';

        // Include deno in PATH for yt-dlp signature solving
        const env = {
            ...process.env,
            PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}`
        };

        const command = `proxychains4 -q yt-dlp --cookies "${cookiesPath}" -f ${format} -g "${videoUrl}"`;

        console.log(`[StreamAPI] Running yt-dlp for ${videoId}, format ${format}`);

        const { stdout, stderr } = await execAsync(command, {
            timeout: 60000,
            env
        });

        const streamUrl = stdout.trim().split('\n')[0];

        if (!streamUrl || !streamUrl.startsWith('http')) {
            console.error('[StreamAPI] Invalid stream URL:', stdout, stderr);
            return new NextResponse('Failed to get stream URL', { status: 503 });
        }

        console.log(`[StreamAPI] Got direct URL for ${videoId}`);

        // Proxy the stream through our server (important: URL is IP-locked)
        const streamResponse = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.youtube.com/',
                'Origin': 'https://www.youtube.com',
            }
        });

        if (!streamResponse.ok || !streamResponse.body) {
            console.error('[StreamAPI] Fetch failed:', streamResponse.status);
            return new NextResponse('Failed to fetch stream', { status: 503 });
        }

        const headers = new Headers();
        headers.set('Content-Type', type === 'audio' ? 'audio/mp4' : 'video/mp4');
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'no-cache');
        headers.set('Access-Control-Allow-Origin', '*');

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
        return new NextResponse('Video not available: ' + error.message, { status: 503 });
    }
}
