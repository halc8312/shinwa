'use client'

import { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

// 認証を完全にスキップするため、SessionProviderを削除
export default function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>
}