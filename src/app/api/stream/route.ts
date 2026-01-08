
import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { SocksProxyAgent } from 'socks-proxy-agent';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

interface Tokens {
    visitorData: string;
    poToken: string;
}

// Cloudflare WARP SOCKS5 proxy (default port when running `warp-svc`)
// To enable: Install WARP on VPS, run `warp-cli connect`
const WARP_PROXY = process.env.WARP_PROXY || 'socks5://127.0.0.1:40000';

// Create SOCKS5 agent for WARP
let proxyAgent: SocksProxyAgent | undefined;
try {
    proxyAgent = new SocksProxyAgent(WARP_PROXY);
    console.log(`[StreamAPI] WARP Proxy configured: ${WARP_PROXY}`);
} catch (error) {
    console.warn('[StreamAPI] WARP Proxy not available, using direct connection');
}

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

// Create agent with cookies, tokens, and WARP proxy
const agentOptions: any = {
    keepAlive: true,
};

if (tokens) {
    agentOptions.visitorData = tokens.visitorData;
    agentOptions.poToken = tokens.poToken;
}

// If WARP proxy is available, inject it into agent options
if (proxyAgent) {
    agentOptions.dispatcher = proxyAgent;
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

    // Build attempts with WARP proxy support
    let attempts: any[] = [];

    // Priority 1: Agent with cookies + tokens + WARP proxy
    if (agent) {
        attempts.push({ agent, client: 'WEB' });
        attempts.push({ agent, client: 'IOS' });
        attempts.push({ agent, client: 'ANDROID' });
    }

    // Priority 2: WARP proxy without cookies (clean IP)
    if (proxyAgent) {
        attempts.push({ agent: proxyAgent, client: 'WEB_WARP' });
    }

    // Priority 3: Direct connection (last resort)
    attempts.push({ client: 'WEB' });
    attempts.push({ client: 'IOS' });
    attempts.push({ client: 'ANDROID' });

    for (const options of attempts) {
        try {
            console.log(`[StreamAPI] Attempting: ${options.client}, hasAgent: ${!!options.agent}`);

            const requestOptions: any = {};

            // Add custom User-Agent for mobile clients
            if (options.client === 'IOS') {
                requestOptions.headers = {
                    'User-Agent': 'com.google.ios.youtube/19.10.5 (iPhone16,2; U; CPU iOS 17_4_1 like Mac OS X)'
                };
            } else if (options.client === 'ANDROID') {
                requestOptions.headers = {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                };
            }

            const info = await ytdl.getInfo(videoUrl, { ...options, requestOptions });
            console.log(`[StreamAPI] getInfo success with ${options.client}`);

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
                console.log(`[StreamAPI] No format for ${options.client}`);
                continue;
            }

            console.log(`[StreamAPI] Streaming: ${format.qualityLabel || 'audio'} via ${options.client}`);

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
            console.error(`[StreamAPI] Failed (${options.client}):`, error.message);
        }
    }

    return new NextResponse('Video not available. Try enabling Cloudflare WARP on VPS.', { status: 503 });
}
