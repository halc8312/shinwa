'use client'

import { PlotThread, Chapter } from '@/lib/types'

interface PlotThreadVisualizerProps {
  plotThreads: PlotThread[]
  chapters: Chapter[]
}

export default function PlotThreadVisualizer({ plotThreads, chapters }: PlotThreadVisualizerProps) {
  // 複線の色を取得
  const getThreadColor = (type: PlotThread['type']) => {
    switch (type) {
      case 'main': return '#3b82f6'      // blue-500
      case 'subplot': return '#a855f7'   // purple-500
      case 'character': return '#22c55e' // green-500
      case 'world': return '#f97316'     // orange-500
      default: return '#6b7280'          // gray-500
    }
  }

  // テンションレベルを高さに変換（0-100 -> 0-150px）
  const getTensionHeight = (tension: number, chapterIndex: number, thread: PlotThread) => {
    // 章ごとのテンション変化を計算
    const progress = thread.endChapter 
      ? (chapterIndex - thread.startChapter + 1) / (thread.endChapter - thread.startChapter + 1)
      : (chapterIndex - thread.startChapter + 1) / chapters.length

    // 複線の状態に応じたテンション曲線
    let adjustedTension = tension
    if (thread.status === 'setup') {
      adjustedTension = tension * 0.5
    } else if (thread.status === 'developing') {
      adjustedTension = tension * (0.5 + progress * 0.5)
    } else if (thread.status === 'climax') {
      adjustedTension = tension * (0.8 + progress * 0.2)
    } else if (thread.status === 'resolving') {
      adjustedTension = tension * (1 - progress * 0.3)
    }

    return Math.max(10, adjustedTension * 1.5)
  }

  // 複線が特定の章でアクティブかどうか
  const isThreadActive = (thread: PlotThread, chapterNumber: number) => {
    const start = thread.startChapter
    const end = thread.endChapter || chapters.length
    return chapterNumber >= start && chapterNumber <= end
  }

  // マイルストーンを取得
  const getMilestone = (thread: PlotThread, chapterNumber: number) => {
    return thread.milestones.find(m => m.chapterNumber === chapterNumber)
  }

  // 依存関係の線を描画するための座標を計算
  const getDependencyPath = (fromThread: PlotThread, toThreadId: string, chapterIndex: number) => {
    const toThread = plotThreads.find(t => t.id === toThreadId)
    if (!toThread) return null

    const fromIndex = plotThreads.findIndex(t => t.id === fromThread.id)
    const toIndex = plotThreads.findIndex(t => t.id === toThreadId)
    
    const fromY = 50 + fromIndex * 180
    const toY = 50 + toIndex * 180
    const x = 50 + chapterIndex * 100

    return `M ${x} ${fromY} Q ${x + 50} ${(fromY + toY) / 2} ${x + 100} ${toY}`
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🎭 複線タイムライン</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* ヘッダー（章番号） */}
          <div className="flex items-center mb-4 pl-32">
            {chapters.map((chapter, index) => (
              <div key={chapter.id} className="w-24 text-center">
                <div className="text-xs text-gray-500">第{chapter.number}章</div>
                <div className="text-xs text-gray-400 truncate px-1" title={chapter.title}>
                  {chapter.title || '無題'}
                </div>
              </div>
            ))}
          </div>

          {/* 複線の表示 */}
          <div className="space-y-4">
            {plotThreads.map((thread, threadIndex) => (
              <div key={thread.id} className="flex items-center">
                {/* 複線名 */}
                <div className="w-32 pr-4 flex-shrink-0">
                  <div className="text-sm font-medium truncate" title={thread.name}>
                    {thread.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {thread.type === 'main' ? 'メイン' : 
                     thread.type === 'subplot' ? 'サブ' : 
                     thread.type === 'character' ? 'キャラ' : '世界'}
                  </div>
                </div>

                {/* 複線のビジュアル */}
                <div className="flex items-end relative" style={{ height: '160px' }}>
                  {chapters.map((chapter, chapterIndex) => {
                    const isActive = isThreadActive(thread, chapter.number)
                    const milestone = getMilestone(thread, chapter.number)
                    const height = isActive ? getTensionHeight(thread.tensionLevel, chapterIndex, thread) : 0

                    return (
                      <div key={chapter.id} className="w-24 relative flex items-end justify-center">
                        {isActive && (
                          <>
                            {/* テンションバー */}
                            <div
                              className="w-16 rounded-t transition-all duration-300 relative"
                              style={{
                                height: `${height}px`,
                                backgroundColor: getThreadColor(thread.type),
                                opacity: 0.7
                              }}
                            >
                              {/* マイルストーンマーカー */}
                              {milestone && (
                                <div 
                                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                  title={milestone.description}
                                >
                                  <div className={`w-4 h-4 rounded-full border-2 border-white ${
                                    milestone.achieved ? 'bg-green-500' : 'bg-yellow-500'
                                  }`} />
                                </div>
                              )}
                            </div>

                            {/* 複線の開始/終了マーカー */}
                            {chapter.number === thread.startChapter && (
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs">
                                ▶
                              </div>
                            )}
                            {chapter.number === thread.endChapter && (
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs">
                                ■
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* 依存関係の線（SVGで描画） */}
                  {thread.dependencies.length > 0 && (
                    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
                      {chapters.map((chapter, chapterIndex) => {
                        if (!isThreadActive(thread, chapter.number)) return null
                        
                        return thread.dependencies.map(depId => {
                          const path = getDependencyPath(thread, depId, chapterIndex)
                          if (!path) return null
                          
                          return (
                            <path
                              key={`${thread.id}-${depId}-${chapter.id}`}
                              d={path}
                              fill="none"
                              stroke="#9ca3af"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                              opacity="0.5"
                            />
                          )
                        })
                      })}
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 凡例 */}
          <div className="mt-6 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span>達成済みマイルストーン</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span>未達成マイルストーン</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-px border-t border-dashed border-gray-400" />
              <span>依存関係</span>
            </div>
            <div className="flex items-center gap-2">
              <span>▶</span>
              <span>開始</span>
            </div>
            <div className="flex items-center gap-2">
              <span>■</span>
              <span>終了</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        ※ バーの高さはテンションレベルを表し、複線の進行状況に応じて変化します
      </div>
    </div>
  )
}