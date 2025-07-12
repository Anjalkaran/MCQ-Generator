import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is to make `pdf-parse` work on the client side
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "fs": false,
            "path": false,
            "os": false,
        }
    }
    config.externals.push('pdf-parse');
    return config
  }
};

export default nextConfig;
