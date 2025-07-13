'use client'

import { PlotThread, Chapter, PlotPoint } from '@/lib/types'

interface PlotDensityAnalyzerProps {
  plotThreads: PlotThread[]
  chapters: Chapter[]
}

export default function PlotDensityAnalyzer({ plotThreads, chapters }: PlotDensityAnalyzerProps) {
  // 章ごとのプロット密度を計算
  const calculateDensity = () => {
    return chapters.map(chapter => {
      // 従来のプロットポイント数
      const plotPoints = chapter.state.plotProgress?.length || 0
      
      // アクティブな複線数
      const activeThreads = plotThreads.filter(thread => {
        const start = thread.startChapter
        const end = thread.endChapter || chapters.length
        return chapter.number >= start && chapter.number <= end
      }).length
      
      // マイルストーン数
      const milestones = plotThreads.reduce((count, thread) => {
        return count + thread.milestones.filter(m => m.chapterNumber === chapter.number).length
      }, 0)
      
      // 総密度
      const totalDensity = plotPoints + activeThreads + milestones
      
      return {
        chapter: chapter.number,
        title: chapter.title || `第${chapter.number}章`,
        plotPoints,
        activeThreads,
        milestones,
        totalDensity
      }
    })
  }

  // プロットの衝突を検出
  const detectConflicts = () => {
    const conflicts: Array<{
      type: 'overlap' | 'tension' | 'pacing' | 'dependency'
      severity: 'low' | 'medium' | 'high'
      description: string
      chapters: number[]
    }> = []

    // 1. 同じ章で多すぎる複線の検出
    chapters.forEach(chapter => {
      const activeInChapter = plotThreads.filter(thread => {
        const start = thread.startChapter
        const end = thread.endChapter || chapters.length
        return chapter.number >= start && chapter.number <= end
      })
      
      if (activeInChapter.length > 4) {
        conflicts.push({
          type: 'overlap',
          severity: 'high',
          description: `第${chapter.number}章で${activeInChapter.length}個の複線が同時進行しています`,
          chapters: [chapter.number]
        })
      }
    })

    // 2. テンションレベルの衝突
    plotThreads.forEach((thread1, i) => {
      plotThreads.slice(i + 1).forEach(thread2 => {
        const overlapStart = Math.max(thread1.startChapter, thread2.startChapter)
        const overlapEnd = Math.min(
          thread1.endChapter || chapters.length,
          thread2.endChapter || chapters.length
        )
        
        if (overlapStart <= overlapEnd) {
          const tensionDiff = Math.abs(thread1.tensionLevel - thread2.tensionLevel)
          if (tensionDiff > 50) {
            conflicts.push({
              type: 'tension',
              severity: 'medium',
              description: `「${thread1.name}」と「${thread2.name}」のテンション差が大きすぎます（差: ${tensionDiff}）`,
              chapters: Array.from({ length: overlapEnd - overlapStart + 1 }, (_, i) => overlapStart + i)
            })
          }
        }
      })
    })

    // 3. ペーシングの問題
    const densityData = calculateDensity()
    densityData.forEach((data, index) => {
      if (index > 0) {
        const prevDensity = densityData[index - 1].totalDensity
        const densityChange = Math.abs(data.totalDensity - prevDensity)
        
        if (densityChange > 5) {
          conflicts.push({
            type: 'pacing',
            severity: 'medium',
            description: `第${densityData[index - 1].chapter}章から第${data.chapter}章でプロット密度が急変しています`,
            chapters: [densityData[index - 1].chapter, data.chapter]
          })
        }
      }
    })

    // 4. 依存関係の問題
    plotThreads.forEach(thread => {
      thread.dependencies.forEach(depId => {
        const depThread = plotThreads.find(t => t.id === depId)
        if (depThread && depThread.startChapter > thread.startChapter) {
          conflicts.push({
            type: 'dependency',
            severity: 'high',
            description: `「${thread.name}」が「${depThread.name}」に依存していますが、依存先の方が後に開始されます`,
            chapters: [thread.startChapter, depThread.startChapter]
          })
        }
      })
    })

    return conflicts
  }

  // 推奨事項を生成
  const generateRecommendations = () => {
    const recommendations: string[] = []
    const densityData = calculateDensity()
    
    // 密度が低い章
    const lowDensityChapters = densityData.filter(d => d.totalDensity < 2)
    if (lowDensityChapters.length > 0) {
      recommendations.push(
        `第${lowDensityChapters.map(d => d.chapter).join('、')}章のプロット密度が低いです。サブプロットの追加を検討してください。`
      )
    }
    
    // 密度が高すぎる章
    const highDensityChapters = densityData.filter(d => d.totalDensity > 6)
    if (highDensityChapters.length > 0) {
      recommendations.push(
        `第${highDensityChapters.map(d => d.chapter).join('、')}章のプロット密度が高すぎます。一部を他の章に分散することを検討してください。`
      )
    }
    
    // 未完結の複線
    const unresolvedThreads = plotThreads.filter(t => t.status !== 'resolved' && !t.endChapter)
    if (unresolvedThreads.length > 0) {
      recommendations.push(
        `${unresolvedThreads.length}個の複線が終了章を設定していません。計画的な解決を検討してください。`
      )
    }
    
    return recommendations
  }

  const densityData = calculateDensity()
  const conflicts = detectConflicts()
  const recommendations = generateRecommendations()
  const maxDensity = Math.max(...densityData.map(d => d.totalDensity), 1)

  return (
    <div className="space-y-6">
      {/* プロット密度グラフ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 プロット密度分析</h3>
        
        <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="relative h-full">
            {/* グラフ軸 */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
            <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300"></div>
            
            {/* Y軸ラベル */}
            <div className="absolute -left-8 top-0 text-xs text-gray-500">{maxDensity}</div>
            <div className="absolute -left-8 bottom-0 text-xs text-gray-500">0</div>
            
            {/* 密度バー */}
            <div className="absolute inset-0 flex items-end">
              {densityData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end group relative">
                  {/* スタックバー */}
                  <div className="w-full mx-0.5 flex flex-col">
                    {/* マイルストーン */}
                    {data.milestones > 0 && (
                      <div 
                        className="w-full bg-yellow-500"
                        style={{ height: `${(data.milestones / maxDensity) * 100}%` }}
                      />
                    )}
                    {/* アクティブ複線 */}
                    {data.activeThreads > 0 && (
                      <div 
                        className="w-full bg-purple-500"
                        style={{ height: `${(data.activeThreads / maxDensity) * 100}%` }}
                      />
                    )}
                    {/* プロットポイント */}
                    {data.plotPoints > 0 && (
                      <div 
                        className="w-full bg-blue-500"
                        style={{ height: `${(data.plotPoints / maxDensity) * 100}%` }}
                      />
                    )}
                  </div>
                  
                  {/* ツールチップ */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 w-48">
                    <div className="bg-gray-800 text-white text-xs rounded px-3 py-2">
                      <div className="font-medium mb-1">{data.title}</div>
                      <div>プロットポイント: {data.plotPoints}</div>
                      <div>アクティブ複線: {data.activeThreads}</div>
                      <div>マイルストーン: {data.milestones}</div>
                      <div className="font-medium mt-1">合計密度: {data.totalDensity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 凡例 */}
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500" />
            <span>プロットポイント</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500" />
            <span>アクティブ複線</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500" />
            <span>マイルストーン</span>
          </div>
        </div>
      </div>

      {/* 衝突検出 */}
      {conflicts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">⚠️ プロット衝突の検出</h3>
          
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  conflict.severity === 'high' 
                    ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    : conflict.severity === 'medium'
                    ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20'
                    : 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${
                        conflict.severity === 'high' ? 'text-red-700 dark:text-red-300' :
                        conflict.severity === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                        'text-blue-700 dark:text-blue-300'
                      }`}>
                        {conflict.type === 'overlap' ? '重複' :
                         conflict.type === 'tension' ? 'テンション' :
                         conflict.type === 'pacing' ? 'ペーシング' :
                         '依存関係'}の問題
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conflict.severity === 'high' ? 'bg-red-100 text-red-700' :
                        conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {conflict.severity === 'high' ? '高' :
                         conflict.severity === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-sm">{conflict.description}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    第{conflict.chapters.join(', ')}章
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 推奨事項 */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 改善の推奨事項
          </h4>
          <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            {recommendations.map((rec, index) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}