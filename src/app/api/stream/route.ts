
import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

interface Tokens {
    visitorData: string;
    poToken: string;
}

// List of public Invidious/Piped instances to try
const PROXY_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.jing.rocks',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.syncpundit.io',
];

// Load cookies from file
function loadCookies(): ytdl.Cookie[] | undefined {
    try {
        const jsonPath = path.join(process.cwd(), 'cookies.json');
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            const cookies = JSON.parse(content);
            if (Array.isArray(cookies) && cookies.length > 0) {
                console.log(`Loaded ${cookies.length} cookies from JSON`);
                return cookies;
            }
        }
    } catch (error) {
        console.error('Error loading cookies.json:', error);
    }

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
        console.error('Error loading cookies.txt:', error);
    }
    return undefined;
}

function loadTokens(): Tokens | undefined {
    try {
        const tokenPath = path.join(process.cwd(), 'tokens.json');
        if (fs.existsSync(tokenPath)) {
            const content = fs.readFileSync(tokenPath, 'utf-8');
            const tokens = JSON.parse(content);
            if (tokens.visitorData && tokens.poToken) {
                console.log('Loaded PoToken and VisitorData');
                return tokens;
            }
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
    }
    return undefined;
}

const cookies = loadCookies();
const tokens = loadTokens();

const agentOptions: any = {
    keepAlive: true,
};

if (tokens) {
    agentOptions.visitorData = tokens.visitorData;
    agentOptions.poToken = tokens.poToken;
}

const agent = cookies ? ytdl.createAgent(cookies, agentOptions) : undefined;

// Strategy 2: Try Invidious/Piped instances
async function tryInvidiousProxy(videoId: string, type: string): Promise<Response | null> {
    for (const instance of PROXY_INSTANCES) {
        try {
            console.log(`[StreamAPI] Trying proxy: ${instance}`);

            // Detect if Piped or Invidious
            const isPiped = instance.includes('piped');

            let apiUrl: string;
            if (isPiped) {
                apiUrl = `${instance}/streams/${videoId}`;
            } else {
                // Invidious API
                apiUrl = `${instance}/api/v1/videos/${videoId}`;
            }

            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.log(`[StreamAPI] Proxy ${instance} returned ${response.status}`);
                continue;
            }

            const data = await response.json();

            let streamUrl: string | null = null;

            if (isPiped) {
                // Piped format
                if (type === 'audio') {
                    streamUrl = data.audioStreams?.[0]?.url;
                } else {
                    // Find best video stream with audio
                    const videoStream = data.videoStreams?.find((s: any) =>
                        s.videoOnly === false && s.quality
                    ) || data.videoStreams?.[0];
                    streamUrl = videoStream?.url;
                }
            } else {
                // Invidious format
                if (type === 'audio') {
                    streamUrl = data.adaptiveFormats?.find((f: any) =>
                        f.type?.includes('audio')
                    )?.url;
                } else {
                    // Find format with both video and audio
                    streamUrl = data.formatStreams?.find((f: any) =>
                        f.type?.includes('video')
                    )?.url;
                }
            }

            if (streamUrl) {
                console.log(`[StreamAPI] Got stream URL from ${instance}`);

                // Proxy the stream through our server
                const streamResponse = await fetch(streamUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.youtube.com/',
                    }
                });

                if (streamResponse.ok && streamResponse.body) {
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
                }
            }
        } catch (error: any) {
            console.error(`[StreamAPI] Proxy ${instance} failed:`, error.message);
        }
    }
    return null;
}

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

    // Strategy 1: Try ytdl-core with all client types
    const clientTypes = ['WEB', 'IOS', 'ANDROID'];
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
            console.log(`[StreamAPI] Attempting ytdl with client: ${options.client}`);

            const requestOptions: any = {};
            if (options.client !== 'WEB') {
                requestOptions.headers = {
                    'User-Agent': options.client === 'IOS'
                        ? 'com.google.ios.youtube/19.10.5 (iPhone16,2; U; CPU iOS 17_4_1 like Mac OS X)'
                        : 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                };
            }

            const info = await ytdl.getInfo(videoUrl, { ...options, requestOptions });
            console.log(`[StreamAPI] ytdl.getInfo success with ${options.client}`);

            let format;
            if (type === 'audio') {
                format = ytdl.chooseFormat(info.formats, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });
            } else {
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
                console.log(`[StreamAPI] No format found for ${options.client}`);
                continue;
            }

            console.log(`[StreamAPI] Streaming format: ${format.qualityLabel || 'audio'}`);

            const headers = new Headers();
            headers.set('Content-Type', type === 'audio' ? 'audio/webm' : 'video/mp4');
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Cache-Control', 'no-cache');

            if (format.contentLength) {
                headers.set('Content-Length', format.contentLength);
            }

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
            console.error(`[StreamAPI] ytdl failed (${options.client}):`, error.message);
        }
    }

    // Strategy 2: Fallback to Invidious/Piped proxy
    console.log('[StreamAPI] All ytdl attempts failed. Trying Invidious/Piped proxies...');
    const proxyResponse = await tryInvidiousProxy(videoId, type);
    if (proxyResponse) {
        return proxyResponse;
    }

    // All strategies failed
    return new NextResponse('Video not available. All streaming methods failed.', { status: 503 });
}
