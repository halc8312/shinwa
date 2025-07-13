import { PlannedForeshadowing } from '@/lib/types'

export interface ForeshadowingScopeRange {
  short: { min: number; max: number; label: string }
  medium: { min: number; max: number; label: string }
  long: { min: number; max: number; label: string }
}

/**
 * ストーリーの総章数に基づいて伏線のスコープ範囲を動的に計算
 */
export function calculateForeshadowingScopeRanges(totalChapters: number): ForeshadowingScopeRange {
  if (totalChapters <= 5) {
    // 短編小説（1-5章）
    return {
      short: { min: 0, max: 1, label: '即効性（同章〜1章）' },
      medium: { min: 2, max: Math.min(3, totalChapters - 1), label: `短期（2-${Math.min(3, totalChapters - 1)}章）` },
      long: { min: Math.min(4, totalChapters), max: totalChapters, label: `中期（${Math.min(4, totalChapters)}章以上）` }
    }
  } else if (totalChapters <= 15) {
    // 中編小説（6-15章）
    const shortMax = Math.floor(totalChapters * 0.2)
    const mediumMax = Math.floor(totalChapters * 0.5)
    return {
      short: { min: 1, max: shortMax, label: `短期（1-${shortMax}章）` },
      medium: { min: shortMax + 1, max: mediumMax, label: `中期（${shortMax + 1}-${mediumMax}章）` },
      long: { min: mediumMax + 1, max: totalChapters, label: `長期（${mediumMax + 1}章以上）` }
    }
  } else {
    // 長編小説（16章以上）
    const shortMax = Math.floor(totalChapters * 0.15)
    const mediumMax = Math.floor(totalChapters * 0.4)
    return {
      short: { min: 1, max: shortMax, label: `短期（1-${shortMax}章）` },
      medium: { min: shortMax + 1, max: mediumMax, label: `中期（${shortMax + 1}-${mediumMax}章）` },
      long: { min: mediumMax + 1, max: totalChapters, label: `長期（${mediumMax + 1}章以上）` }
    }
  }
}

/**
 * 設置章と回収予定章から適切なスコープを判定
 */
export function determineForeshadowingScope(
  plantChapter: number,
  revealChapter: number,
  totalChapters: number
): 'short' | 'medium' | 'long' {
  const chaptersToReveal = revealChapter - plantChapter
  const scopeRanges = calculateForeshadowingScopeRanges(totalChapters)
  
  if (chaptersToReveal <= scopeRanges.short.max) {
    return 'short'
  } else if (chaptersToReveal <= scopeRanges.medium.max - scopeRanges.short.max) {
    return 'medium'
  } else {
    return 'long'
  }
}

/**
 * 伏線が回収期限を過ぎているかチェック
 */
export function isForeshadowingOverdue(
  foreshadowing: {
    status: string
    plannedRevealChapter?: number
  },
  currentChapter: number
): boolean {
  return (
    foreshadowing.status !== 'revealed' &&
    foreshadowing.plannedRevealChapter !== undefined &&
    currentChapter > foreshadowing.plannedRevealChapter
  )
}

/**
 * 伏線の健全性をチェック
 */
export interface ForeshadowingHealth {
  isHealthy: boolean
  issues: string[]
  suggestions: string[]
}

export function checkForeshadowingHealth(
  foreshadowing: {
    hint: string
    payoff: string
    status: string
    plannedRevealChapter?: number
  },
  plantedChapter: number,
  currentChapter: number,
  totalChapters: number
): ForeshadowingHealth {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // ヒントが空の場合
  if (!foreshadowing.hint || foreshadowing.hint.trim() === '') {
    issues.push('ヒントが設定されていません')
    suggestions.push('伏線のヒントを明確に記述してください')
  }
  
  // 回収内容が空で、既に回収済みの場合
  if (foreshadowing.status === 'revealed' && (!foreshadowing.payoff || foreshadowing.payoff.trim() === '')) {
    issues.push('回収内容が記録されていません')
    suggestions.push('どのように伏線が回収されたか記録してください')
  }
  
  // 回収期限を過ぎている場合
  if (isForeshadowingOverdue(foreshadowing, currentChapter)) {
    const overdue = currentChapter - (foreshadowing.plannedRevealChapter || 0)
    issues.push(`回収予定を${overdue}章過ぎています`)
    suggestions.push('早急に回収するか、回収予定章を見直してください')
  }
  
  // 最終章に近づいているのに未回収の場合
  if (
    foreshadowing.status !== 'revealed' &&
    currentChapter >= totalChapters - 2 &&
    totalChapters > 3
  ) {
    issues.push('物語の終盤ですが、まだ回収されていません')
    suggestions.push('次の章で回収することを検討してください')
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    suggestions
  }
}