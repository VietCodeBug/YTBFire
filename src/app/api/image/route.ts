import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        // Validate URL is from YouTube image domains
        const parsedUrl = new URL(url);
        const allowedHosts = [
            'i.ytimg.com',
            'i9.ytimg.com',
            'yt3.ggpht.com',
            'lh3.googleusercontent.com',
        ];

        if (!allowedHosts.some(host => parsedUrl.hostname.includes(host) || parsedUrl.hostname === host)) {
            return new NextResponse('Invalid image host', { status: 400 });
        }

        // Fetch the image
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*',
                'Referer': 'https://www.youtube.com/',
            },
        });

        if (!response.ok) {
            return new NextResponse('Failed to fetch image', { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const imageBuffer = await response.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache 24 hours
            },
        });
    } catch (error: any) {
        console.error('Image proxy error:', error);
        return new NextResponse('Image proxy error', { status: 500 });
    }
}
