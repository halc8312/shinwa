import { WritingRules, Chapter } from '../types'
import { countCharacters } from '../utils'

interface RuleViolation {
  rule: string
  description: string
  severity: 'error' | 'warning' | 'info'
  position?: { start: number; end: number }
  suggestion?: string
}

export class RulesEngine {
  private rules: WritingRules
  private customRules: string[]

  constructor(rules: WritingRules, customRules: string[] = []) {
    this.rules = rules
    this.customRules = customRules
  }

  // AIプロンプトに含めるルールテキストを生成
  generateRulesPrompt(): string {
    const sections: string[] = []

    // 基本ルール
    sections.push(`## 執筆ルール

### 基本設定
- 視点: ${this.getPointOfViewText()}
- 時制: ${this.getTenseText()}
- 章の文字数: ${this.rules.chapterLength.min}〜${this.rules.chapterLength.max}文字
- 言語: ${this.getLanguageText()}`)

    // 文体ルール
    if (this.rules.style) {
      sections.push(`### 文体ルール
${this.rules.style}`)
    }

    // カスタムルール
    if (this.customRules.length > 0) {
      sections.push(`### カスタムルール
${this.customRules.map(rule => `- ${rule}`).join('\n')}`)
    }

    return sections.join('\n\n')
  }

  // 章の内容をチェック
  checkChapter(chapter: Chapter): RuleViolation[] {
    const violations: RuleViolation[] = []

    // 文字数チェック
    const charCount = countCharacters(chapter.content)
    if (charCount < this.rules.chapterLength.min) {
      violations.push({
        rule: 'chapterLength',
        description: `文字数が少なすぎます（現在: ${charCount}文字、最小: ${this.rules.chapterLength.min}文字）`,
        severity: 'warning',
        suggestion: `あと${this.rules.chapterLength.min - charCount}文字追加してください`
      })
    } else if (charCount > this.rules.chapterLength.max) {
      violations.push({
        rule: 'chapterLength',
        description: `文字数が多すぎます（現在: ${charCount}文字、最大: ${this.rules.chapterLength.max}文字）`,
        severity: 'warning',
        suggestion: `${charCount - this.rules.chapterLength.max}文字削減してください`
      })
    }

    // 視点チェック
    const povViolations = this.checkPointOfView(chapter.content)
    violations.push(...povViolations)

    // 時制チェック
    const tenseViolations = this.checkTense(chapter.content)
    violations.push(...tenseViolations)

    // スタイルチェック
    const styleViolations = this.checkStyle(chapter.content)
    violations.push(...styleViolations)

    return violations
  }

  // 視点のチェック
  private checkPointOfView(content: string): RuleViolation[] {
    const violations: RuleViolation[] = []

    if (this.rules.pointOfView === 'first') {
      // 一人称視点のチェック
      const thirdPersonPronouns = /彼は|彼女は|彼らは|それは/g
      const matches = content.match(thirdPersonPronouns)
      if (matches && matches.length > 5) {
        violations.push({
          rule: 'pointOfView',
          description: '一人称視点なのに三人称的な表現が多く含まれています',
          severity: 'warning',
          suggestion: '主人公の視点から見た描写に修正してください'
        })
      }
    } else if (this.rules.pointOfView === 'third') {
      // 三人称視点のチェック
      const firstPersonPronouns = /私は|俺は|僕は|わたしは/g
      const matches = content.match(firstPersonPronouns)
      if (matches && matches.length > 3) {
        violations.push({
          rule: 'pointOfView',
          description: '三人称視点なのに一人称的な表現が含まれています',
          severity: 'warning',
          suggestion: '客観的な視点からの描写に修正してください'
        })
      }
    }

    return violations
  }

  // 時制のチェック
  private checkTense(content: string): RuleViolation[] {
    const violations: RuleViolation[] = []
    const sentences = content.split(/[。！？]/)

    if (this.rules.tense === 'past') {
      // 過去形チェック
      const presentTenseEndings = /です|ます|いる|ある$/
      let presentCount = 0
      
      sentences.forEach(sentence => {
        if (presentTenseEndings.test(sentence.trim())) {
          presentCount++
        }
      })

      if (presentCount > sentences.length * 0.2) {
        violations.push({
          rule: 'tense',
          description: '過去形設定なのに現在形の文が多く含まれています',
          severity: 'warning',
          suggestion: '「た」「だった」などの過去形表現に統一してください'
        })
      }
    } else {
      // 現在形チェック
      const pastTenseEndings = /でした|ました|いた|あった|だった$/
      let pastCount = 0
      
      sentences.forEach(sentence => {
        if (pastTenseEndings.test(sentence.trim())) {
          pastCount++
        }
      })

      if (pastCount > sentences.length * 0.2) {
        violations.push({
          rule: 'tense',
          description: '現在形設定なのに過去形の文が多く含まれています',
          severity: 'warning',
          suggestion: '「です」「ます」などの現在形表現に統一してください'
        })
      }
    }

    return violations
  }

  // スタイルチェック
  private checkStyle(content: string): RuleViolation[] {
    const violations: RuleViolation[] = []

    // 段落の長さチェック
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    const longParagraphs = paragraphs.filter(p => countCharacters(p) > 400)
    
    if (longParagraphs.length > 0) {
      violations.push({
        rule: 'style',
        description: `${longParagraphs.length}個の段落が長すぎます（400文字以上）`,
        severity: 'info',
        suggestion: '読みやすさのため、長い段落は分割することを検討してください'
      })
    }

    // 同じ表現の繰り返しチェック
    const words = content.match(/[\u4e00-\u9fa5]+/g) || []
    const wordCounts = new Map<string, number>()
    
    words.forEach(word => {
      if (word.length >= 2) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    })

    const overusedWords = Array.from(wordCounts.entries())
      .filter(([word, count]) => count > 15 && word.length > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (overusedWords.length > 0) {
      violations.push({
        rule: 'style',
        description: `以下の表現が頻繁に使用されています: ${overusedWords.map(w => `「${w[0]}」(${w[1]}回)`).join('、')}`,
        severity: 'info',
        suggestion: '表現の多様性を増やすため、類義語や言い換えを検討してください'
      })
    }

    // 会話文のバランスチェック
    const dialogueLines = content.split('\n').filter(line => line.match(/^「.*」$/))
    const dialogueRatio = dialogueLines.length / content.split('\n').length

    if (dialogueRatio > 0.6) {
      violations.push({
        rule: 'style',
        description: '会話文の割合が高すぎます（60%以上）',
        severity: 'info',
        suggestion: '地の文での描写や説明を増やしてバランスを取ってください'
      })
    } else if (dialogueRatio < 0.1 && content.length > 1000) {
      violations.push({
        rule: 'style',
        description: '会話文の割合が低すぎます（10%未満）',
        severity: 'info',
        suggestion: 'キャラクターの会話を増やして物語に動きを加えてください'
      })
    }

    return violations
  }

  // 修正提案を生成
  generateSuggestions(violations: RuleViolation[]): string {
    if (violations.length === 0) {
      return 'すべての執筆ルールに準拠しています。'
    }

    const suggestions: string[] = ['## 執筆ルールチェック結果']
    
    const errors = violations.filter(v => v.severity === 'error')
    const warnings = violations.filter(v => v.severity === 'warning')
    const infos = violations.filter(v => v.severity === 'info')

    if (errors.length > 0) {
      suggestions.push('\n### エラー（必ず修正が必要）')
      errors.forEach(v => {
        suggestions.push(`- ${v.description}`)
        if (v.suggestion) {
          suggestions.push(`  → ${v.suggestion}`)
        }
      })
    }

    if (warnings.length > 0) {
      suggestions.push('\n### 警告（修正を推奨）')
      warnings.forEach(v => {
        suggestions.push(`- ${v.description}`)
        if (v.suggestion) {
          suggestions.push(`  → ${v.suggestion}`)
        }
      })
    }

    if (infos.length > 0) {
      suggestions.push('\n### 情報（品質向上のための提案）')
      infos.forEach(v => {
        suggestions.push(`- ${v.description}`)
        if (v.suggestion) {
          suggestions.push(`  → ${v.suggestion}`)
        }
      })
    }

    return suggestions.join('\n')
  }

  private getPointOfViewText(): string {
    switch (this.rules.pointOfView) {
      case 'first': return '一人称'
      case 'third': return '三人称'
      case 'omniscient': return '神視点'
      default: return this.rules.pointOfView
    }
  }

  private getTenseText(): string {
    return this.rules.tense === 'past' ? '過去形' : '現在形'
  }

  private getLanguageText(): string {
    switch (this.rules.language) {
      case 'ja': return '日本語'
      case 'en': return '英語'
      case 'zh': return '中国語'
      case 'ko': return '韓国語'
      default: return this.rules.language
    }
  }
}

// プロジェクトのルールエンジンを取得
export async function getProjectRulesEngine(projectId: string): Promise<RulesEngine> {
  const { projectService } = await import('./project-service')
  const project = await projectService.getProject(projectId)
  
  if (!project) {
    throw new Error('Project not found')
  }

  const customRules = JSON.parse(
    localStorage.getItem(`shinwa-custom-rules-${projectId}`) || '[]'
  )

  return new RulesEngine(project.settings.writingRules, customRules)
}