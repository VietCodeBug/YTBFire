
import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

interface Tokens {
    visitorData: string;
    poToken: string;
}

// Load cookies from file
function loadCookies(): ytdl.Cookie[] | undefined {
    // Try valid cookies.json first
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

    // Fallback to cookies.txt (Netscape format)
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
                console.log(`Loaded ${cookies.length} cookies from TXT`);
                return cookies;
            }
        }
    } catch (error) {
        console.error('Error loading cookies.txt:', error);
    }
    return undefined;
}

// Load tokens from file
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

// Create agent with cookies and tokens if available
const agentOptions: any = {
    keepAlive: true,
};

if (tokens) {
    agentOptions.visitorData = tokens.visitorData;
    agentOptions.poToken = tokens.poToken;
}

const agent = cookies ? ytdl.createAgent(cookies, agentOptions) : undefined;

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
    const clientTypes = ['WEB', 'IOS', 'ANDROID'];

    let attempts: any[] = [];

    // Prioritize agent attempts (with tokens/cookies)
    if (agent) {
        attempts.push({ agent, client: 'WEB' });
        attempts.push({ agent, client: 'IOS' });
        attempts.push({ agent, client: 'ANDROID' });
    }

    // Fallback attempts without agent (less likely to work for blocked IPs but worth a try)
    attempts.push({ client: 'WEB' });
    attempts.push({ client: 'IOS' });
    attempts.push({ client: 'ANDROID' });

    // Strategy 1: Try ytdl-core (Authenticated + Headers + PoToken)
    for (const options of attempts) {
        try {
            console.log(`[StreamAPI] Attempting with client: ${options.client}, hasAgent: ${!!options.agent}`);

            // Only add custom User-Agent for non-WEB clients or when no agent is used
            const requestOptions: any = {};
            if (options.client !== 'WEB') {
                requestOptions.headers = {
                    'User-Agent': options.client === 'IOS'
                        ? 'com.google.ios.youtube/19.10.5 (iPhone16,2; U; CPU iOS 17_4_1 like Mac OS X)'
                        : 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                };
            }

            const info = await ytdl.getInfo(videoUrl, { ...options, requestOptions });

            // Log success to help debug
            console.log(`[StreamAPI] GetInfo success with ${options.client}`);

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
                console.log(`[StreamAPI] No suitable format found for ${options.client}`);
                continue;
            }

            console.log(`[StreamAPI] Found format: ${format.qualityLabel || 'audio'} (${format.mimeType})`);

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
                        console.error('Stream flow error:', err.message);
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
            console.error(`[StreamAPI] Attempt failed (${options.client}):`, error.message);
            if (error.message.includes('Sign in')) {
                console.warn(`[StreamAPI] Auth Check Failed for ${options.client}`);
            }
        }
    }

    return new NextResponse('Video not available. Try a different video or update cookies/tokens.', { status: 503 });
}
