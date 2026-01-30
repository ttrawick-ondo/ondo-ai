const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Configure webpack to handle native modules properly
  webpack: (config, { isServer }) => {
    // Handle native modules for Prisma adapter-libsql
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@libsql/client',
        '@prisma/adapter-libsql',
        'libsql',
      ]
    }

    // Ignore README.md and .node files in node_modules
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    })

    return config
  },

  // Required for server components with database
  experimental: {
    serverComponentsExternalPackages: [
      '@libsql/client',
      '@prisma/adapter-libsql',
      'libsql',
    ],
  },
}

// Sentry wrapping options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  // Only upload source maps if SENTRY_DSN is configured
  dryRun: !process.env.SENTRY_DSN,

  // Org and project from environment or defaults
  org: process.env.SENTRY_ORG || 'ondo-ai',
  project: process.env.SENTRY_PROJECT || 'ondo-ai',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
