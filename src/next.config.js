
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Alias for handlebars
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/cjs/handlebars.js',
    };

    // For server-side builds, externalize server-only packages
    if (isServer) {
      config.externals.push(
        'mongodb',
        'mongodb-client-encryption',
        '@opentelemetry/api',
        '@opentelemetry/exporter-jaeger',
        '@opentelemetry/instrumentation-http'
      );
    }

    // For client-side builds, provide fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        tls: false,
        net: false,
        child_process: false,
        process: false,
        async_hooks: false,
        'timers/promises': false,
      };
    }

    return config;
  },
   allowedDevOrigins: [
    'http://shekhar.sekiz.in:4000',
    'http://6000-firebase-studio-1750337802356.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev',
    'https://6000-firebase-studio-1750337802356.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev',
    '6000-firebase-studio-1750337802356.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev'
  ],
};

module.exports = nextConfig;
