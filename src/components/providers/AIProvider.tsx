'use client'

import { useEffect } from 'react'
import { initializeAIManager } from '@/lib/ai/init'
import { migrateStorage } from '@/lib/utils/storage-migration'

export default function AIProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // クライアントサイドでAIマネージャーを初期化
    initializeAIManager()
    
    // ストレージマイグレーションを実行
    migrateStorage()
  }, [])

  return <>{children}</>
}