'use client'

import { useState, useEffect } from 'react'
import { PlotThread, PlotMilestone, Chapter } from '@/lib/types'
import Button from '@/components/ui/Button'

interface PlotThreadManagerProps {
  projectId: string
  chapters: Chapter[]
  onUpdate?: (threads: PlotThread[]) => void
}

export default function PlotThreadManager({ projectId, chapters, onUpdate }: PlotThreadManagerProps) {
  const [plotThreads, setPlotThreads] = useState<PlotThread[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingThread, setEditingThread] = useState<PlotThread | null>(null)

  // ローカルストレージから複線データを読み込み
  useEffect(() => {
    const storedThreads = localStorage.getItem(`shinwa-plot-threads-${projectId}`)
    if (storedThreads) {
      setPlotThreads(JSON.parse(storedThreads))
    } else {
      // 既存のプロットポイントから初期複線を生成
      initializeFromExistingPlots()
    }
  }, [projectId])

  // 既存のプロットポイントから複線を初期化
  const initializeFromExistingPlots = () => {
    const mainThread: PlotThread = {
      id: 'main-plot',
      name: 'メインプロット',
      description: '物語の主要な筋',
      type: 'main',
      status: 'developing',
      startChapter: 1,
      milestones: [],
      tensionLevel: 50,
      dependencies: []
    }

    // 既存のプロットポイントをマイルストーンとして変換
    chapters.forEach(chapter => {
      chapter.state.plotProgress?.forEach(plot => {
        const milestone: PlotMilestone = {
          id: plot.id,
          description: plot.description,
          chapterNumber: chapter.number,
          achieved: plot.resolved,
          impact: plot.type === 'climax' ? 'major' : plot.type === 'setup' ? 'minor' : 'moderate'
        }
        mainThread.milestones.push(milestone)
      })
    })

    const initialThreads = [mainThread]
    setPlotThreads(initialThreads)
    saveThreads(initialThreads)
  }

  // 複線データを保存
  const saveThreads = (threads: PlotThread[]) => {
    localStorage.setItem(`shinwa-plot-threads-${projectId}`, JSON.stringify(threads))
    onUpdate?.(threads)
  }

  // 新規複線の作成
  const createNewThread = () => {
    const newThread: PlotThread = {
      id: `thread-${Date.now()}`,
      name: '',
      description: '',
      type: 'subplot',
      status: 'setup',
      startChapter: Math.max(...chapters.map(c => c.number), 1),
      milestones: [],
      tensionLevel: 30,
      dependencies: []
    }
    setEditingThread(newThread)
    setIsCreating(true)
  }

  // 複線の保存
  const saveThread = (thread: PlotThread) => {
    const updatedThreads = isCreating
      ? [...plotThreads, thread]
      : plotThreads.map(t => t.id === thread.id ? thread : t)
    
    setPlotThreads(updatedThreads)
    saveThreads(updatedThreads)
    setEditingThread(null)
    setIsCreating(false)
  }

  // 複線の削除
  const deleteThread = (threadId: string) => {
    if (threadId === 'main-plot') {
      alert('メインプロットは削除できません')
      return
    }
    
    const updatedThreads = plotThreads.filter(t => t.id !== threadId)
    setPlotThreads(updatedThreads)
    saveThreads(updatedThreads)
  }

  // 複線の進行状況を計算
  const calculateProgress = (thread: PlotThread) => {
    if (thread.milestones.length === 0) return 0
    const achieved = thread.milestones.filter(m => m.achieved).length
    return Math.round((achieved / thread.milestones.length) * 100)
  }

  // 複線の色を取得
  const getThreadColor = (type: PlotThread['type']) => {
    switch (type) {
      case 'main': return 'blue'
      case 'subplot': return 'purple'
      case 'character': return 'green'
      case 'world': return 'orange'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🧵 複線スレッド管理</h3>
        <Button 
          onClick={createNewThread}
          size="sm"
          className="flex items-center gap-2"
        >
          <span>➕</span>
          <span>新規複線</span>
        </Button>
      </div>

      {/* 複線リスト */}
      <div className="space-y-4">
        {plotThreads.map(thread => (
          <div 
            key={thread.id}
            className={`border rounded-lg p-4 bg-white dark:bg-gray-800 ${
              editingThread?.id === thread.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {editingThread?.id === thread.id ? (
              // 編集モード
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">複線名</label>
                  <input
                    type="text"
                    value={editingThread.name}
                    onChange={e => setEditingThread({ ...editingThread, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    placeholder="例：主人公の成長"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">説明</label>
                  <textarea
                    value={editingThread.description}
                    onChange={e => setEditingThread({ ...editingThread, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    rows={2}
                    placeholder="この複線の概要を入力"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">タイプ</label>
                    <select
                      value={editingThread.type}
                      onChange={e => setEditingThread({ ...editingThread, type: e.target.value as PlotThread['type'] })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    >
                      <option value="main">メインプロット</option>
                      <option value="subplot">サブプロット</option>
                      <option value="character">キャラクター</option>
                      <option value="world">世界観</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">状態</label>
                    <select
                      value={editingThread.status}
                      onChange={e => setEditingThread({ ...editingThread, status: e.target.value as PlotThread['status'] })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    >
                      <option value="setup">設定中</option>
                      <option value="developing">展開中</option>
                      <option value="climax">クライマックス</option>
                      <option value="resolving">解決中</option>
                      <option value="resolved">完結</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingThread(null)
                      setIsCreating(false)
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveThread(editingThread)}
                    disabled={!editingThread.name || !editingThread.description}
                  >
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              // 表示モード
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{thread.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        thread.type === 'main' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                        thread.type === 'subplot' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                        thread.type === 'character' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                      }`}>
                        {thread.type === 'main' ? 'メイン' : thread.type === 'subplot' ? 'サブ' : thread.type === 'character' ? 'キャラ' : '世界'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        thread.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        thread.status === 'climax' ? 'bg-red-100 text-red-700' :
                        thread.status === 'developing' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {thread.status === 'setup' ? '設定中' : 
                         thread.status === 'developing' ? '展開中' :
                         thread.status === 'climax' ? 'クライマックス' :
                         thread.status === 'resolving' ? '解決中' : '完結'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{thread.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingThread(thread)}
                    >
                      編集
                    </Button>
                    {thread.id !== 'main-plot' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteThread(thread.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        削除
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 進行状況バー */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>進行度</span>
                    <span>{calculateProgress(thread)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        thread.type === 'main' ? 'bg-blue-500' :
                        thread.type === 'subplot' ? 'bg-purple-500' :
                        thread.type === 'character' ? 'bg-green-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${calculateProgress(thread)}%` }}
                    />
                  </div>
                </div>
                
                {/* マイルストーン数 */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>📍 開始: 第{thread.startChapter}章</span>
                  {thread.endChapter && <span>🏁 終了: 第{thread.endChapter}章</span>}
                  <span>🎯 マイルストーン: {thread.milestones.length}個</span>
                  <span>🌡️ テンション: {thread.tensionLevel}/100</span>
                </div>
                
                {/* 依存関係 */}
                {thread.dependencies.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">依存: </span>
                    {thread.dependencies.map(depId => {
                      const depThread = plotThreads.find(t => t.id === depId)
                      return depThread ? (
                        <span key={depId} className="ml-2 text-blue-600 dark:text-blue-400">
                          {depThread.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 複線がない場合 */}
      {plotThreads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>複線が設定されていません</p>
          <p className="text-sm mt-1">新規複線ボタンから作成してください</p>
        </div>
      )}
    </div>
  )
}