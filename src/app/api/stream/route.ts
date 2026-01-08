import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const type = searchParams.get('type') || 'video'; // 'video' hoặc 'audio'

    if (!videoId) {
        return new NextResponse('Missing videoId parameter', { status: 400 });
    }

    // Validate videoId format
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return new NextResponse('Invalid videoId format', { status: 400 });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Get video info
        const info = await ytdl.getInfo(videoUrl);

        // Choose format based on type
        let format;
        if (type === 'audio') {
            // Audio only - saves bandwidth significantly (~128kbps vs several Mbps)
            format = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });
        } else {
            // Video + Audio combined - quality 18 is 360p MP4 (smooth, server-friendly)
            // Try to get format with both video and audio
            format = ytdl.chooseFormat(info.formats, {
                quality: '18',
                filter: 'audioandvideo'
            });

            // Fallback to best available if 360p not available
            if (!format) {
                format = ytdl.chooseFormat(info.formats, {
                    quality: 'lowest',
                    filter: 'audioandvideo'
                });
            }
        }

        if (!format) {
            return new NextResponse('No suitable format found', { status: 404 });
        }

        // Set response headers
        const headers = new Headers();
        headers.set('Content-Type', type === 'audio' ? 'audio/webm' : 'video/mp4');
        headers.set('Accept-Ranges', 'bytes');

        if (format.contentLength) {
            headers.set('Content-Length', format.contentLength);
        }

        // Create readable stream from ytdl
        const stream = ytdl.downloadFromInfo(info, { format });

        // Convert Node.js stream to Web ReadableStream
        const readable = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk: Buffer) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                stream.on('end', () => {
                    controller.close();
                });
                stream.on('error', (err: Error) => {
                    console.error('Stream error:', err);
                    controller.error(err);
                });
            },
            cancel() {
                stream.destroy();
            }
        });

        return new NextResponse(readable, {
            headers,
            status: 200
        });

    } catch (error: any) {
        console.error('Stream API Error:', error);

        // Handle specific ytdl errors
        if (error.message?.includes('Video unavailable')) {
            return new NextResponse('Video not available', { status: 404 });
        }
        if (error.message?.includes('Sign in')) {
            return new NextResponse('Age-restricted or private video', { status: 403 });
        }

        return new NextResponse(`Stream error: ${error.message}`, { status: 500 });
    }
}
