import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// Load cookies from file
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
                        value: parts[6],
                        path: parts[2],
                        secure: parts[3] === 'TRUE',
                        httpOnly: false,
                        expirationDate: parseInt(parts[4]) || undefined,
                    });
                }
            }

            if (cookies.length > 0) {
                console.log(`Loaded ${cookies.length} cookies`);
                return cookies;
            }
        }
    } catch (error) {
        console.error('Error loading cookies:', error);
    }
    return undefined;
}

const cookies = loadCookies();

// Create agent with cookies
const agent = cookies ? ytdl.createAgent(cookies) : undefined;

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

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Get video info with cookies
        const info = await ytdl.getInfo(videoUrl, { agent });

        let format;
        if (type === 'audio') {
            format = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });
        } else {
            format = ytdl.chooseFormat(info.formats, {
                quality: '18',
                filter: 'audioandvideo'
            });

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

        const headers = new Headers();
        headers.set('Content-Type', type === 'audio' ? 'audio/webm' : 'video/mp4');
        headers.set('Accept-Ranges', 'bytes');

        if (format.contentLength) {
            headers.set('Content-Length', format.contentLength);
        }

        // Download with cookies
        const stream = ytdl.downloadFromInfo(info, { format, agent });

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

        if (error.message?.includes('Video unavailable')) {
            return new NextResponse('Video not available', { status: 404 });
        }
        if (error.message?.includes('Sign in')) {
            return new NextResponse('Age-restricted or private video', { status: 403 });
        }

        return new NextResponse(`Stream error: ${error.message}`, { status: 500 });
    }
}
