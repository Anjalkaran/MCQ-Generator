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
    // This is the correct way to fix the 'fs' module not found error.
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
            os: false,
        };
    }

    // This is to handle pdf-parse. It may not be needed with the fallback above but is good practice.
    config.externals.push({
      'pdf-parse': 'commonjs pdf-parse',
    });

    return config;
  },
};

export default nextConfig;
