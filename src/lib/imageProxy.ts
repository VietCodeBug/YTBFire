// Helper function to proxy YouTube images through our server
export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return '/placeholder.jpg';

    // If it's already a local URL or data URL, return as-is
    if (url.startsWith('/') || url.startsWith('data:')) {
        return url;
    }

    // Check if it's a YouTube image URL
    const youtubeImageHosts = ['i.ytimg.com', 'i9.ytimg.com', 'yt3.ggpht.com', 'lh3.googleusercontent.com'];

    try {
        const parsedUrl = new URL(url);
        if (youtubeImageHosts.some(host => parsedUrl.hostname.includes(host))) {
            return `/api/image?url=${encodeURIComponent(url)}`;
        }
    } catch {
        // Invalid URL, return as-is
    }

    return url;
}
