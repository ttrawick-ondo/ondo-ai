/**
 * Session Authentication Helper
 *
 * Provides server-side session validation for API routes.
 * All API routes should use requireSession() instead of trusting
 * client-supplied userId parameters.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Get the authenticated session, or null if not authenticated.
 * Use this in API routes to get the current user's identity.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session
}

/**
 * Standard 401 Unauthorized response.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

/**
 * Standard 403 Forbidden response.
 */
export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 }
  )
}
