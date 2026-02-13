'use client'

import { Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Ondo AI</CardTitle>
          <CardDescription>
            Sign in with your Ondo Finance account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error === 'OAuthSignin' && 'Error starting the sign in process.'}
              {error === 'OAuthCallback' && 'Error during the sign in callback.'}
              {error === 'OAuthCreateAccount' && 'Could not create user account.'}
              {error === 'Callback' && 'Error in the OAuth callback.'}
              {error === 'AccessDenied' && 'Access denied. You may not have permission.'}
              {error === 'default' && 'An error occurred during sign in.'}
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn('okta', { callbackUrl })}
          >
            Sign in with Okta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
