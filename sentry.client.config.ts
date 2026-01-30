// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // You can remove this option if you're not planning to use the Session Replay feature:
  replaysSessionSampleRate: 0.1,

  // If you don't want to use Session Replay, just remove the line below:
  replaysOnErrorSampleRate: 1.0,

  // You can remove this option if you're not planning to use the Session Replay feature
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Additional tracing configuration goes in here
    }),
  ],

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Don't send errors for canceled requests
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }

    // Filter out rate limit errors (expected behavior)
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return null
    }

    return event
  },

  // Set environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Tag release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
})
