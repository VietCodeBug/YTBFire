/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
            },
            {
                protocol: 'https',
                hostname: 'i9.ytimg.com',
            },
            {
                protocol: 'https',
                hostname: 'yt3.ggpht.com',
            },
            {
                protocol: 'https',
                hostname: '*.googleusercontent.com',
            },
        ],
    },
    // Fix for ytsr and ytdl-core compatibility with Next.js bundler
    experimental: {
        serverComponentsExternalPackages: ['ytsr', '@distube/ytdl-core'],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [...(config.externals || []), 'ytsr', '@distube/ytdl-core'];
        }
        return config;
    },
    // Add CSP headers to allow unsafe-eval for corporate proxies
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob: https:; img-src 'self' data: https: blob:; media-src 'self' https: data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:; font-src 'self' data: https:;",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
