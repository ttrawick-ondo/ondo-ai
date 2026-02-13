import { NextAuthOptions } from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
    }),
  ],
  callbacks: {
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
        session.user.id = token.id as string
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
