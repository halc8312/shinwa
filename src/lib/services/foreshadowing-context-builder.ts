import { Chapter, Foreshadowing } from '@/lib/types'
import { isForeshadowingOverdue, calculateForeshadowingScopeRanges } from '@/lib/utils/foreshadowing-utils'

export interface ForeshadowingContext {
  mustResolve: ForeshadowingWithContext[]      // 今章で必ず回収すべき伏線
  shouldResolve: ForeshadowingWithContext[]    // 回収が推奨される伏線
  canResolve: ForeshadowingWithContext[]       // 余裕があれば回収可能な伏線
  planted: ForeshadowingWithContext[]          // まだ回収時期ではない伏線
  recentlyResolved: ForeshadowingWithContext[] // 最近回収された伏線（参考用）
}

export interface ForeshadowingWithContext extends Foreshadowing {
  plantedChapter: number
  plantedChapterTitle: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  suggestedResolution?: string
}

export class ForeshadowingContextBuilder {
  /**
   * 現在の章に対する伏線コンテキストを構築
   */
  static buildContext(
    chapters: Chapter[],
    currentChapterNumber: number,
    totalChapters: number
  ): ForeshadowingContext {
    const context: ForeshadowingContext = {
      mustResolve: [],
      shouldResolve: [],
      canResolve: [],
      planted: [],
      recentlyResolved: []
    }

    const scopeRanges = calculateForeshadowingScopeRanges(totalChapters)
    const isNearEnd = currentChapterNumber >= totalChapters - 2

    // すべての伏線を収集して分類
    chapters.forEach(chapter => {
      chapter.state.foreshadowing?.forEach(f => {
        const contextual = this.enrichForeshadowing(f, chapter, currentChapterNumber, totalChapters)
        
        // 最近回収された伏線
        if (f.status === 'revealed' && f.chapterRevealed && currentChapterNumber - f.chapterRevealed <= 2) {
          context.recentlyResolved.push(contextual)
          return
        }

        // 未回収の伏線を分類
        if (f.status !== 'revealed') {
          // 回収予定章に到達
          if (f.plannedRevealChapter === currentChapterNumber) {
            contextual.urgency = 'critical'
            contextual.reason = '回収予定章に到達しました'
            context.mustResolve.push(contextual)
          }
          // 期限切れ
          else if (isForeshadowingOverdue(f, currentChapterNumber)) {
            const overdue = currentChapterNumber - (f.plannedRevealChapter || 0)
            contextual.urgency = overdue >= 2 ? 'critical' : 'high'
            contextual.reason = `回収予定を${overdue}章過ぎています`
            
            if (overdue >= 2) {
              context.mustResolve.push(contextual)
            } else {
              context.shouldResolve.push(contextual)
            }
          }
          // 物語の終盤で未回収
          else if (isNearEnd && f.significance === 'major') {
            contextual.urgency = 'high'
            contextual.reason = '物語の終盤であり、重要な伏線です'
            context.shouldResolve.push(contextual)
          }
          // 短期伏線で時間が経過
          else if (f.scope === 'short' && currentChapterNumber - chapter.number >= scopeRanges.short.max) {
            contextual.urgency = 'medium'
            contextual.reason = '短期伏線の推奨回収期間を過ぎています'
            context.shouldResolve.push(contextual)
          }
          // 中期伏線で適切な時期
          else if (f.scope === 'medium' && 
                   currentChapterNumber - chapter.number >= scopeRanges.short.max &&
                   currentChapterNumber - chapter.number <= scopeRanges.medium.max) {
            contextual.urgency = 'low'
            contextual.reason = '中期伏線の適切な回収時期です'
            context.canResolve.push(contextual)
          }
          // まだ回収時期ではない
          else {
            contextual.urgency = 'low'
            contextual.reason = 'まだ回収時期ではありません'
            context.planted.push(contextual)
          }
        }
      })
    })

    // 優先度でソート
    const significanceOrder = { major: 3, moderate: 2, minor: 1 }
    const sortByPriority = (a: ForeshadowingWithContext, b: ForeshadowingWithContext) => {
      const sigA = significanceOrder[a.significance || 'moderate'] || 2
      const sigB = significanceOrder[b.significance || 'moderate'] || 2
      return sigB - sigA
    }

    context.mustResolve.sort(sortByPriority)
    context.shouldResolve.sort(sortByPriority)
    context.canResolve.sort(sortByPriority)

    return context
  }

  /**
   * 伏線に文脈情報を追加
   */
  private static enrichForeshadowing(
    foreshadowing: Foreshadowing,
    plantedChapter: Chapter,
    currentChapterNumber: number,
    totalChapters: number
  ): ForeshadowingWithContext {
    const contextual: ForeshadowingWithContext = {
      ...foreshadowing,
      plantedChapter: plantedChapter.number,
      plantedChapterTitle: plantedChapter.title,
      urgency: 'low',
      reason: ''
    }

    // 回収方法の提案を生成
    if (foreshadowing.category) {
      switch (foreshadowing.category) {
        case 'character':
          contextual.suggestedResolution = 'キャラクターの行動や対話を通じて明かす'
          break
        case 'world':
          contextual.suggestedResolution = '世界観の描写や説明の中で自然に明かす'
          break
        case 'plot':
          contextual.suggestedResolution = '物語の展開の中で必然的に明かす'
          break
        case 'other':
          contextual.suggestedResolution = 'テーマに関連する出来事や省察を通じて明かす'
          break
        case 'mystery':
          contextual.suggestedResolution = '謎解きや発見のシーンで劇的に明かす'
          break
      }
    }

    return contextual
  }

  /**
   * AIプロンプト用の伏線情報を生成
   */
  static generatePrompt(context: ForeshadowingContext, currentChapterNumber: number): string {
    const parts: string[] = []

    if (context.mustResolve.length > 0) {
      parts.push('【必ず回収すべき伏線】')
      context.mustResolve.forEach(f => {
        parts.push(`- "${f.hint}" (第${f.plantedChapter}章で設置, ${f.reason})`)
        if (f.suggestedResolution) {
          parts.push(`  推奨: ${f.suggestedResolution}`)
        }
      })
    }

    if (context.shouldResolve.length > 0) {
      parts.push('\n【回収が推奨される伏線】')
      context.shouldResolve.forEach(f => {
        parts.push(`- "${f.hint}" (第${f.plantedChapter}章で設置, ${f.reason})`)
        if (f.suggestedResolution) {
          parts.push(`  推奨: ${f.suggestedResolution}`)
        }
      })
    }

    if (context.canResolve.length > 0) {
      parts.push('\n【余裕があれば回収可能な伏線】')
      context.canResolve.forEach(f => {
        parts.push(`- "${f.hint}" (第${f.plantedChapter}章で設置)`)
      })
    }

    if (context.planted.length > 0) {
      parts.push('\n【設置済みだが回収時期ではない伏線】')
      context.planted.forEach(f => {
        const revealText = f.plannedRevealChapter ? `第${f.plannedRevealChapter}章で回収予定` : '適切な時期に回収'
        parts.push(`- "${f.hint}" (${revealText})`)
      })
    }

    if (context.recentlyResolved.length > 0) {
      parts.push('\n【参考：最近回収された伏線】')
      context.recentlyResolved.forEach(f => {
        parts.push(`- "${f.hint}" (第${f.chapterRevealed}章で回収済み)`)
      })
    }

    parts.push('\n伏線回収の注意事項:')
    parts.push('- 必ず回収すべき伏線は、物語の流れに自然に組み込んでください')
    parts.push('- 無理やり回収するのではなく、キャラクターの行動や対話を通じて明かしてください')
    parts.push('- 複数の伏線を一度に回収する場合は、読者が混乱しないよう配慮してください')

    return parts.join('\n')
  }

  /**
   * 章計画での伏線回収を検証
   */
  static validatePlannedResolutions(
    chapterPlan: any,
    context: ForeshadowingContext
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    const plannedToResolve = chapterPlan.foreshadowingToResolve || []

    // 必須回収の伏線がすべて計画に含まれているか確認
    context.mustResolve.forEach(f => {
      if (!plannedToResolve.includes(f.hint)) {
        issues.push(`重要な伏線「${f.hint}」の回収が計画されていません (${f.reason})`)
      }
    })

    // 計画された回収が実際に可能かチェック
    plannedToResolve.forEach((hint: string) => {
      const allForeshadowing = [
        ...context.mustResolve,
        ...context.shouldResolve,
        ...context.canResolve
      ]
      
      if (!allForeshadowing.some(f => f.hint === hint)) {
        issues.push(`「${hint}」は回収可能な伏線リストに含まれていません`)
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}