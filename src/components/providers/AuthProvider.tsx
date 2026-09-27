'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

interface AuthProviderProps {
  children: ReactNode
}

// 認証はスキップしているが、useSession を使うコンポーネントのためにProviderは必要。
// session={null} を渡すことで、/api/auth/session へのリクエストを行わず未ログイン状態として扱う。
export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider session={null} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}
