import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AIProvider from '@/components/providers/AIProvider'
import AuthProvider from '@/components/providers/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shinwa - AI Novel Writing Engine',
  description: 'An advanced AI-powered novel writing engine for creating consistent and immersive stories',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <AIProvider>
            {children}
          </AIProvider>
        </AuthProvider>
      </body>
    </html>
  )
}