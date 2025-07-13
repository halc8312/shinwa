import { Chapter, Foreshadowing } from '@/lib/types'
import { aiManager } from '@/lib/ai/manager'

export interface ForeshadowingResolutionValidation {
  foreshadowingHint: string
  wasResolved: boolean
  confidence: 'high' | 'medium' | 'low' | 'none'
  evidence?: string
  suggestion?: string
}

export class ForeshadowingResolutionValidator {
  /**
   * 章の内容から伏線の回収を検証
   */
  static async validateResolutions(
    chapterContent: string,
    plannedResolutions: string[],
    foreshadowingDetails: Foreshadowing[],
    aiModel: string
  ): Promise<ForeshadowingResolutionValidation[]> {
    if (plannedResolutions.length === 0) {
      return []
    }

    // 各伏線の詳細情報を取得
    const foreshadowingMap = new Map<string, Foreshadowing>()
    foreshadowingDetails.forEach(f => {
      foreshadowingMap.set(f.hint, f)
    })

    const systemPrompt = `あなたは小説の伏線回収を分析する専門家です。
与えられた章の内容から、指定された伏線が実際に回収されているかを判定してください。

判定基準:
- 伏線のヒントに関連する内容が明確に描写されている → high
- 関連する内容が暗示されているが、明確ではない → medium
- わずかに触れられているが、回収とは言えない → low
- 全く触れられていない → none

各伏線について以下のJSON形式で回答してください:
{
  "resolutions": [
    {
      "hint": "伏線のヒント",
      "confidence": "high/medium/low/none",
      "evidence": "該当箇所の引用（最大100文字）",
      "wasResolved": true/false,
      "suggestion": "改善案（回収されていない場合のみ）"
    }
  ]
}`

    const userPrompt = `以下の章の内容から、指定された伏線の回収状況を分析してください。

【章の内容】
${chapterContent}

【回収予定の伏線】
${plannedResolutions.map(hint => {
  const detail = foreshadowingMap.get(hint)
  return `- "${hint}"${detail?.significance ? ` (重要度: ${detail.significance})` : ''}`
}).join('\n')}

各伏線が実際に回収されているか判定し、JSON形式で回答してください。`

    try {
      const response = await aiManager.complete({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 2000
      })

      const result = this.parseValidationResponse(response.content)
      
      return plannedResolutions.map(hint => {
        const validation = result.find(r => r.hint === hint)
        if (validation) {
          return {
            foreshadowingHint: hint,
            wasResolved: validation.wasResolved,
            confidence: validation.confidence,
            evidence: validation.evidence,
            suggestion: validation.suggestion
          }
        } else {
          return {
            foreshadowingHint: hint,
            wasResolved: false,
            confidence: 'none' as const,
            suggestion: '検証できませんでした'
          }
        }
      })
    } catch (error) {
      console.error('Failed to validate foreshadowing resolutions:', error)
      // エラー時はすべて未解決として扱う
      return plannedResolutions.map(hint => ({
        foreshadowingHint: hint,
        wasResolved: false,
        confidence: 'none' as const,
        suggestion: 'AIによる検証に失敗しました'
      }))
    }
  }

  /**
   * 簡易的な伏線回収チェック（AIを使わない）
   */
  static quickCheck(
    chapterContent: string,
    foreshadowingHint: string
  ): { likelyResolved: boolean; keywordMatches: number } {
    const contentLower = chapterContent.toLowerCase()
    const hintLower = foreshadowingHint.toLowerCase()
    
    // ヒントのキーワードを抽出
    const keywords = hintLower
      .split(/[、。\s]+/)
      .filter(word => word.length > 2)
    
    // キーワードの出現をカウント
    let matches = 0
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        matches++
      }
    })
    
    // キーワードの50%以上が含まれていれば回収の可能性が高い
    const likelyResolved = matches >= keywords.length * 0.5 && keywords.length > 0
    
    return {
      likelyResolved,
      keywordMatches: matches
    }
  }

  /**
   * AI応答をパース
   */
  private static parseValidationResponse(content: string): any[] {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        return parsed.resolutions || []
      }
      
      // 直接JSONとして解析を試みる
      const parsed = JSON.parse(content)
      return parsed.resolutions || []
    } catch (error) {
      console.error('Failed to parse validation response:', error)
      return []
    }
  }

  /**
   * 伏線回収の改善提案を生成
   */
  static generateImprovementSuggestions(
    validations: ForeshadowingResolutionValidation[],
    chapterPlan: any
  ): string[] {
    const suggestions: string[] = []
    
    validations.forEach(validation => {
      if (!validation.wasResolved && validation.confidence === 'none') {
        const resolutionNote = chapterPlan.foreshadowingResolutionNotes?.[validation.foreshadowingHint]
        
        if (resolutionNote) {
          suggestions.push(
            `伏線「${validation.foreshadowingHint}」は計画では「${resolutionNote}」として回収予定でしたが、実際には描写されていません。計画に沿って追記することをお勧めします。`
          )
        } else {
          suggestions.push(
            `伏線「${validation.foreshadowingHint}」の回収が確認できませんでした。物語の流れに自然に組み込む形で追加してください。`
          )
        }
      } else if (!validation.wasResolved && validation.confidence === 'low') {
        suggestions.push(
          `伏線「${validation.foreshadowingHint}」への言及が不十分です。より明確に描写することをお勧めします。`
        )
      }
    })
    
    return suggestions
  }
}