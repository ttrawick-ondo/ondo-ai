'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Building2, CheckCircle2, XCircle, Clock, Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthSession } from '@/hooks/useCurrentUser'
import { useInvitationByToken, useAcceptInvitation } from '@/lib/queries'

type InvitationStatus = 'loading' | 'valid' | 'expired' | 'used' | 'not_found' | 'accepted' | 'error'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuthSession()
  const { data: invitation, isLoading: isInvitationLoading, error } = useInvitationByToken(token)
  const acceptInvitation = useAcceptInvitation()

  const [status, setStatus] = useState<InvitationStatus>('loading')

  useEffect(() => {
    if (isInvitationLoading || isAuthLoading) {
      setStatus('loading')
      return
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage.includes('expired')) {
        setStatus('expired')
      } else if (errorMessage.includes('used') || errorMessage.includes('already')) {
        setStatus('used')
      } else if (errorMessage.includes('not found')) {
        setStatus('not_found')
      } else {
        setStatus('error')
      }
      return
    }

    if (invitation) {
      setStatus('valid')
    }
  }, [invitation, isInvitationLoading, isAuthLoading, error])

  const handleAccept = async () => {
    if (!user?.id || !token) return

    try {
      const result = await acceptInvitation.mutateAsync({ token, userId: user.id })
      setStatus('accepted')
      // Redirect to workspace after a short delay
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('already a member')) {
        setStatus('used')
      } else {
        setStatus('error')
      }
    }
  }

  const handleSignIn = () => {
    signIn('okta', { callbackUrl: `/invite/${token}` })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please ask your workspace admin to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Already a Member</CardTitle>
            <CardDescription>
              You are already a member of this workspace, or this invitation has already been used.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/')}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to the team!</CardTitle>
            <CardDescription>
              You have successfully joined {invitation?.workspace.name}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              We could not process this invitation. Please try again or contact support.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Valid invitation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You are invited!</CardTitle>
          <CardDescription>
            You have been invited to join a workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Workspace</span>
              <span className="font-medium">{invitation?.workspace.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Role</span>
              <Badge variant="secondary">
                {roleLabels[invitation?.role || 'member'] || invitation?.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invited Email</span>
              <span className="text-sm">{invitation?.email}</span>
            </div>
          </div>

          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground text-center">
              Please sign in to accept this invitation.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          ) : (
            <Button className="w-full" onClick={handleSignIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in to Accept
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/')}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
