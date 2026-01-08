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
                        value: parts[6].trim(),
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

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // List of clients to try (Round-robin strategy)
    // WEB is default (good for quality but blocked easily)
    // IOS/ANDROID are mobile clients (often bypass restrictions but might have lower quality formats)
    const clientTypes = ['WEB', 'IOS', 'ANDROID'];

    // Create attempt configurations
    // 1. Try with agent (cookies) + WEB
    // 2. Try with agent (cookies) + IOS
    // 3. Try with agent (cookies) + ANDROID
    // 4. Try without agent + WEB
    // 5. Try without agent + IOS

    let attempts: any[] = [];

    if (agent) {
        attempts.push({ agent, client: 'WEB' });
        attempts.push({ agent, client: 'IOS' });
        attempts.push({ agent, client: 'ANDROID' });
    }

    attempts.push({ client: 'WEB' });
    attempts.push({ client: 'IOS' });
    attempts.push({ client: 'ANDROID' });

    for (const options of attempts) {
        try {
            // Add request options headers for better mimicry
            const requestOptions = {
                headers: {
                    'User-Agent': options.client === 'IOS'
                        ? 'com.google.ios.youtube/19.10.5 (iPhone16,2; U; CPU iOS 17_4_1 like Mac OS X)'
                        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                }
            };

            const info = await ytdl.getInfo(videoUrl, { ...options, requestOptions });

            let format;
            if (type === 'audio') {
                format = ytdl.chooseFormat(info.formats, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });
            } else {
                // Try multiple quality options
                const qualities = ['18', '22', '136', '135', '134'];
                for (const q of qualities) {
                    try {
                        format = ytdl.chooseFormat(info.formats, {
                            quality: q,
                            filter: 'audioandvideo'
                        });
                        if (format) break;
                    } catch { }
                }

                if (!format) {
                    format = ytdl.chooseFormat(info.formats, {
                        quality: 'lowest',
                        filter: 'audioandvideo'
                    });
                }
            }

            if (!format) {
                continue; // Try next attempt
            }

            console.log(`[StreamAPI] Success with client: ${options.client}, hasAgent: ${!!options.agent}`);

            const headers = new Headers();
            headers.set('Content-Type', type === 'audio' ? 'audio/webm' : 'video/mp4');
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Cache-Control', 'no-cache');

            if (format.contentLength) {
                headers.set('Content-Length', format.contentLength);
            }

            // Important: Use the same options for download
            const stream = ytdl.downloadFromInfo(info, { format, ...options });

            const readable = new ReadableStream({
                start(controller) {
                    stream.on('data', (chunk: Buffer) => {
                        controller.enqueue(new Uint8Array(chunk));
                    });
                    stream.on('end', () => {
                        controller.close();
                    });
                    stream.on('error', (err: Error) => {
                        console.error('Stream error:', err.message);
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
            console.error(`Attempt failed (${options.client}):`, error.message);
            // Continue to next attempt
        }
    }

    // All attempts failed
    return new NextResponse('Video not available. Try a different video or update cookies.', { status: 503 });
}
