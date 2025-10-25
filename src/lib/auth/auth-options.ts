import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // 認証をスキップするため、adapterを無効化
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 組み込みAIの動作確認のため、認証をスキップしダミーユーザーを返す
        return {
          id: 'dummy-user-id',
          email: credentials?.email || 'dummy@example.com',
          name: 'Dummy User',
          image: null
        }
      }
    }),
    // Google認証を無効化
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}