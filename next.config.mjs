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
};

export default nextConfig;
