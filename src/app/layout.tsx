import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AIProvider from '@/components/providers/AIProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shinwa - AI Novel Writing Engine',
  description: 'An advanced AI-powered novel writing engine for creating consistent and immersive stories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AIProvider>
          {children}
        </AIProvider>
      </body>
    </html>
  )
}