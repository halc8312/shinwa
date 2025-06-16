import { Chapter, Foreshadowing, Project } from '@/lib/types'
import { chapterService } from './chapter-service'
import { checkForeshadowingHealth, calculateForeshadowingScopeRanges, isForeshadowingOverdue } from '@/lib/utils/foreshadowing-utils'

interface ForeshadowingReport {
  totalCount: number
  plantedCount: number
  reinforcedCount: number
  revealedCount: number
  overdueCount: number
  healthIssues: {
    foreshadowingId: string
    hint: string
    chapter: number
    issues: string[]
    suggestions: string[]
  }[]
  recommendations: string[]
}

interface ForeshadowingResolutionCandidate {
  foreshadowing: Foreshadowing
  chapterId: string
  chapterNumber: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export class ForeshadowingTrackerService {
  /**
   * 章生成時に自動的に伏線を処理
   */
  static async processForeshadowingForChapter(
    projectId: string,
    chapterId: string,
    chapterNumber: number,
    chapterContent: string,
    chapters: Chapter[]
  ): Promise<void> {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return

    // 回収予定の伏線をチェック
    const candidates = this.findResolutionCandidates(chapters, chapterNumber, chapterContent)
    
    for (const candidate of candidates) {
      if (candidate.confidence === 'high') {
        // 高信頼度の場合は自動的に回収済みにマーク
        await this.markForeshadowingAsRevealed(
          projectId,
          candidate.chapterId,
          candidate.foreshadowing.id,
          chapterNumber
        )
      }
    }
  }

  /**
   * 回収候補の伏線を見つける
   */
  private static findResolutionCandidates(
    chapters: Chapter[],
    currentChapterNumber: number,
    chapterContent: string
  ): ForeshadowingResolutionCandidate[] {
    const candidates: ForeshadowingResolutionCandidate[] = []
    const contentLower = chapterContent.toLowerCase()

    chapters.forEach(chapter => {
      chapter.state.foreshadowing?.forEach(f => {
        if (f.status === 'revealed') return

        // 回収予定章に到達した場合
        if (f.plannedRevealChapter === currentChapterNumber) {
          candidates.push({
            foreshadowing: f,
            chapterId: chapter.id,
            chapterNumber: chapter.number,
            reason: '回収予定章に到達',
            confidence: 'high'
          })
        }
        // 回収予定を過ぎている場合
        else if (f.plannedRevealChapter && currentChapterNumber > f.plannedRevealChapter) {
          // ヒントのキーワードが本文に含まれているかチェック
          const hintKeywords = f.hint.toLowerCase().split(/\s+/)
          const keywordMatches = hintKeywords.filter(keyword => 
            keyword.length > 2 && contentLower.includes(keyword)
          ).length
          
          if (keywordMatches >= hintKeywords.length * 0.5) {
            candidates.push({
              foreshadowing: f,
              chapterId: chapter.id,
              chapterNumber: chapter.number,
              reason: '回収予定を過ぎており、関連キーワードが本文に含まれる',
              confidence: 'medium'
            })
          }
        }
      })
    })

    return candidates
  }

  /**
   * 伏線を回収済みとしてマーク
   */
  static async markForeshadowingAsRevealed(
    projectId: string,
    chapterId: string,
    foreshadowingId: string,
    revealedChapter: number
  ): Promise<void> {
    await chapterService.updateForeshadowing(projectId, chapterId, foreshadowingId, {
      status: 'revealed',
      chapterRevealed: revealedChapter
    })
  }

  /**
   * プロジェクト全体の伏線レポートを生成
   */
  static generateForeshadowingReport(project: Project, chapters: Chapter[]): ForeshadowingReport {
    const report: ForeshadowingReport = {
      totalCount: 0,
      plantedCount: 0,
      reinforcedCount: 0,
      revealedCount: 0,
      overdueCount: 0,
      healthIssues: [],
      recommendations: []
    }

    const currentChapter = Math.max(...chapters.map(c => c.number), 1)
    const totalChapters = project.chapterStructure?.totalChapters || chapters.length
    const allForeshadowing: Map<string, { f: Foreshadowing, chapter: Chapter }> = new Map()

    // すべての伏線を収集
    chapters.forEach(chapter => {
      chapter.state.foreshadowing?.forEach(f => {
        if (!allForeshadowing.has(f.id)) {
          allForeshadowing.set(f.id, { f, chapter })
          report.totalCount++
          
          switch (f.status) {
            case 'planted':
              report.plantedCount++
              break
            case 'reinforced':
              report.reinforcedCount++
              break
            case 'revealed':
              report.revealedCount++
              break
          }

          if (isForeshadowingOverdue(f, currentChapter)) {
            report.overdueCount++
          }
        }
      })
    })

    // 健全性チェック
    allForeshadowing.forEach(({ f, chapter }) => {
      const health = checkForeshadowingHealth(f, chapter.number, currentChapter, totalChapters)
      if (!health.isHealthy) {
        report.healthIssues.push({
          foreshadowingId: f.id,
          hint: f.hint,
          chapter: chapter.number,
          issues: health.issues,
          suggestions: health.suggestions
        })
      }
    })

    // 推奨事項の生成
    if (report.overdueCount > 0) {
      report.recommendations.push(
        `${report.overdueCount}個の伏線が回収予定を過ぎています。早急に回収するか、回収予定を見直してください。`
      )
    }

    const unrevealedRatio = (report.plantedCount + report.reinforcedCount) / report.totalCount
    if (currentChapter >= totalChapters - 2 && unrevealedRatio > 0.3) {
      report.recommendations.push(
        '物語の終盤に差し掛かっていますが、未回収の伏線が多く残っています。重要な伏線から優先的に回収してください。'
      )
    }

    if (report.revealedCount === 0 && report.totalCount > 5) {
      report.recommendations.push(
        'まだ一つも伏線が回収されていません。読者の満足感を高めるため、小さな伏線から回収を始めることをお勧めします。'
      )
    }

    return report
  }

  /**
   * 伏線の関連性を分析
   */
  static analyzeForeshadowingRelationships(chapters: Chapter[]): Map<string, string[]> {
    const relationships = new Map<string, string[]>()
    const foreshadowingByChapter = new Map<number, Foreshadowing[]>()

    // 章ごとに伏線を整理
    chapters.forEach(chapter => {
      if (chapter.state.foreshadowing?.length > 0) {
        foreshadowingByChapter.set(chapter.number, chapter.state.foreshadowing)
      }
    })

    // 同じ章に出現する伏線を関連付け
    foreshadowingByChapter.forEach(foreshadowings => {
      foreshadowings.forEach((f1, i) => {
        foreshadowings.forEach((f2, j) => {
          if (i !== j) {
            const related = relationships.get(f1.id) || []
            if (!related.includes(f2.id)) {
              related.push(f2.id)
              relationships.set(f1.id, related)
            }
          }
        })
      })
    })

    return relationships
  }

  /**
   * 次の章で回収すべき伏線の提案
   */
  static suggestForeshadowingForNextChapter(
    chapters: Chapter[],
    nextChapterNumber: number,
    totalChapters: number
  ): Foreshadowing[] {
    const suggestions: Foreshadowing[] = []
    const scopeRanges = calculateForeshadowingScopeRanges(totalChapters)

    chapters.forEach(chapter => {
      chapter.state.foreshadowing?.forEach(f => {
        if (f.status === 'revealed') return

        // 回収予定章に到達
        if (f.plannedRevealChapter === nextChapterNumber) {
          suggestions.push(f)
        }
        // 短期伏線で設置から時間が経過
        else if (f.scope === 'short' && nextChapterNumber - chapter.number >= scopeRanges.short.max) {
          suggestions.push(f)
        }
        // 物語の終盤で未回収
        else if (nextChapterNumber >= totalChapters - 1) {
          suggestions.push(f)
        }
      })
    })

    // 重要度でソート（高い順）
    return suggestions.sort((a, b) => {
      const sigOrder = { major: 3, moderate: 2, minor: 1 }
      return (sigOrder[b.significance || 'moderate'] || 2) - (sigOrder[a.significance || 'moderate'] || 2)
    })
  }
}