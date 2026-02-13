import { NextAuthOptions } from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      // Auto-provision user in database on first sign-in
      if (!user.email) {
        console.error('No email provided by Okta')
        return false
      }

      try {
        // Upsert user - create if not exists, update if exists
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name || profile?.name || 'User',
            avatar: user.image || (profile as { picture?: string })?.picture || null,
            lastLoginAt: new Date(),
          },
          create: {
            id: profile?.sub || user.id, // Use Okta sub as ID for consistency
            email: user.email,
            name: user.name || profile?.name || 'User',
            avatar: user.image || (profile as { picture?: string })?.picture || null,
            role: 'user',
            lastLoginAt: new Date(),
          },
        })
        return true
      } catch (error) {
        console.error('Error provisioning user:', error)
        return false
      }
    },
    async jwt({ token, account, profile }) {
      // Persist the Okta user info in the JWT
      if (account && profile) {
        token.id = profile.sub
        token.email = profile.email
        token.name = profile.name
      }
      return token
    },
    async session({ session, token }) {
      // Make user ID available in the session
      if (session.user) {
        // Look up user by email to get the database ID
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true },
        })
        session.user.id = dbUser?.id || (token.id as string)
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
}
