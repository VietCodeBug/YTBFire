
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

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

    // Format 18: 360p MP4 with audio
    // Format 140: audio only m4a  
    const format = type === 'audio' ? '140' : '18';

    console.log(`[StreamAPI] Streaming ${videoId} format ${format}`);

    try {
        // Use yt-dlp to output video directly to stdout via proxychains
        // -o - means output to stdout
        const ytdlp = spawn('proxychains4', [
            '-q',
            'yt-dlp',
            '--cookies', cookiesPath,
            '-f', format,
            '-o', '-',
            videoUrl
        ], {
            env: {
                ...process.env,
                PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}`,
                HOME: process.env.HOME || '/home/phamvietanh19218'
            }
        });

        // Create a readable stream from yt-dlp stdout
        const stream = new ReadableStream({
            start(controller) {
                ytdlp.stdout.on('data', (chunk: Buffer) => {
                    controller.enqueue(new Uint8Array(chunk));
                });

                ytdlp.stdout.on('end', () => {
                    controller.close();
                });

                ytdlp.stdout.on('error', (err) => {
                    console.error('[StreamAPI] stdout error:', err);
                    controller.error(err);
                });

                ytdlp.stderr.on('data', (data) => {
                    // Log warnings but don't fail
                    const msg = data.toString();
                    if (!msg.includes('WARNING')) {
                        console.error('[StreamAPI] stderr:', msg);
                    }
                });

                ytdlp.on('error', (err) => {
                    console.error('[StreamAPI] spawn error:', err);
                    controller.error(err);
                });

                ytdlp.on('close', (code) => {
                    if (code !== 0 && code !== null) {
                        console.error(`[StreamAPI] yt-dlp exited with code ${code}`);
                    }
                });
            },
            cancel() {
                ytdlp.kill();
            }
        });

        const headers = new Headers();
        headers.set('Content-Type', type === 'audio' ? 'audio/mp4' : 'video/mp4');
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'no-cache');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(stream, {
            headers,
            status: 200
        });

    } catch (error: any) {
        console.error('[StreamAPI] Error:', error.message);
        return new NextResponse('Video not available: ' + error.message, { status: 503 });
    }
}
