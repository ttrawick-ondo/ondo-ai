// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Enable profiling for Node.js
  profilesSampleRate: 1.0,

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Don't send errors for rate limits
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return null
    }

    // Don't send errors for validation issues (user error, not system error)
    if (error instanceof Error && error.name === 'ValidationError') {
      return null
    }

    return event
  },

  // Set environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Tag release version
  release: process.env.APP_VERSION || 'development',

  // Add context about the request
  integrations: [
    Sentry.extraErrorDataIntegration({
      depth: 10, // Capture more context
    }),
  ],
})
