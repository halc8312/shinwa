import { 
  AIProvider, 
  AIProviderConfig, 
  AICompletionOptions, 
  AICompletionResponse, 
  AIStreamResponse,
  AIError 
} from '../types'

/**
 * GenSpark AI Provider
 * GenSparkの組み込みAI機能を使用してテキスト生成を行う
 */
export class GenSparkProvider implements AIProvider {
  name = 'GenSpark'
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    try {
      // GenSparkはClaude Codeのセッション内で動作しているため、
      // Gemini 2.0 Flash等の高性能LLMを使用してテキスト生成を行う
      const prompt = this.buildPromptFromMessages(options.messages)
      
      // ここでは簡易的な実装として、メッセージを統合してレスポンスを生成
      // 実際のGenSparkセッションでは、組み込みのLLM機能を使用
      const response = await this.generateWithGemini(prompt, options)
      
      return {
        content: response.content,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(response.content),
          totalTokens: this.estimateTokens(prompt) + this.estimateTokens(response.content)
        },
        finishReason: 'stop'
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<AIStreamResponse> {
    try {
      const prompt = this.buildPromptFromMessages(options.messages)
      const response = await this.generateWithGemini(prompt, options)
      
      // ストリーミングのシミュレーション（実際はchunk単位で生成）
      const words = response.content.split('')
      for (let i = 0; i < words.length; i++) {
        yield {
          content: words[i],
          done: i === words.length - 1
        }
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async validateApiKey(): Promise<boolean> {
    // GenSparkは組み込み機能のため、常に有効
    return true
  }

  private buildPromptFromMessages(messages: Array<{ role: string; content: string }>): string {
    let prompt = ''
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `<システム指示>\n${message.content}\n</システム指示>\n\n`
      } else if (message.role === 'user') {
        prompt += `<ユーザー>\n${message.content}\n</ユーザー>\n\n`
      } else if (message.role === 'assistant') {
        prompt += `<アシスタント>\n${message.content}\n</アシスタント>\n\n`
      }
    }
    
    prompt += '<アシスタント>\n'
    return prompt
  }

  private async generateWithGemini(
    prompt: string, 
    options: AICompletionOptions
  ): Promise<{ content: string }> {
    // GenSparkの組み込みAI機能を使用
    // この実装では、Gemini 2.0 Flash経由でテキスト生成を行う想定
    
    // サーバーサイドで実行される場合、環境変数からAPIキーを取得
    let apiKey = this.config.apiKey || process.env.GENSPARK_API_KEY || process.env.GEMINI_API_KEY
    
    // 'genspark-builtin'は実際のキーではないのでスキップ
    if (apiKey === 'genspark-builtin') {
      apiKey = process.env.GEMINI_API_KEY || ''
    }
    
    if (!apiKey) {
      // APIキーがない場合は、基本的なテキスト生成ロジックで代替
      return {
        content: this.generateFallbackResponse(prompt, options)
      }
    }

    // 実際のAPI呼び出し（Gemini経由）
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            topP: options.topP ?? 0.95,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`GenSpark API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      return { content }
    } catch (error) {
      console.error('Gemini API error:', error)
      // フォールバック
      return {
        content: this.generateFallbackResponse(prompt, options)
      }
    }
  }

  private generateFallbackResponse(prompt: string, options: AICompletionOptions): string {
    // より実用的なフォールバック応答を生成
    // プロンプトから意図を推測して適切な応答を生成
    
    const lowerPrompt = prompt.toLowerCase()
    
    // 小説執筆関連の応答
    if (lowerPrompt.includes('小説') || lowerPrompt.includes('物語') || lowerPrompt.includes('chapter') || lowerPrompt.includes('キャラクター')) {
      return this.generateNovelContent(prompt)
    }
    
    // プロット・構成関連
    if (lowerPrompt.includes('プロット') || lowerPrompt.includes('構成') || lowerPrompt.includes('outline')) {
      return this.generatePlotOutline(prompt)
    }
    
    // キャラクター設定
    if (lowerPrompt.includes('character') || lowerPrompt.includes('登場人物')) {
      return this.generateCharacterProfile(prompt)
    }
    
    // デフォルトの応答
    return `【GenSpark デモモード】

より高品質な生成を行うには、AI設定からGemini APIキーを設定してください。

現在のプロンプト長: ${prompt.length}文字
Temperature: ${options.temperature ?? 0.7}
Max Tokens: ${options.maxTokens ?? 2048}

Gemini APIキーを設定すると、以下の機能が利用可能になります：
- 高品質な小説生成
- 詳細なキャラクター設定
- プロット構成の自動生成
- 長文コンテンツの生成（最大100万トークン）

AI設定 → GenSpark AI → Gemini APIキーを入力してください。`
  }

  private generateNovelContent(prompt: string): string {
    return `【第1章：新たな始まり】

朝日が東の空を染める頃、主人公は目を覚ました。
窓から差し込む柔らかな光が、部屋の中を優しく照らしている。

今日から、新しい生活が始まる。
期待と不安が入り混じった気持ちを抱えながら、主人公は起き上がった。

「さあ、始めよう」

そう呟いて、主人公は一歩を踏み出した。

---

💡 **より詳細な小説生成には、Gemini APIキーの設定が必要です**

AI設定画面から「GenSpark AI」を選択し、Gemini APIキーを入力することで：
- より長く詳細な物語の生成
- キャラクターの深い心理描写
- 複雑なプロット展開
- 一貫性のある世界観

などが可能になります。`
  }

  private generatePlotOutline(prompt: string): string {
    return `【物語の構成案】

## 序章：世界の紹介
- 舞台設定の説明
- 主要キャラクターの登場
- 日常の描写

## 第一幕：転機
- 事件の発生
- 主人公の決意
- 旅立ち

## 第二幕：試練
- 困難との遭遇
- 仲間との出会い
- 成長の過程

## 第三幕：クライマックス
- 最大の危機
- 真実の発覚
- 決戦

## 終章：決着
- 問題の解決
- 新たな日常
- 未来への示唆

---

💡 **Gemini APIキーを設定すると、より詳細なプロット構成が生成できます**`
  }

  private generateCharacterProfile(prompt: string): string {
    return `【キャラクタープロフィール】

**名前**: 未設定
**年齢**: 20代
**性別**: 未設定
**職業**: 未設定

**性格**:
- 正義感が強い
- 少し不器用
- 仲間思い

**背景**:
主人公は平凡な日常を送っていたが、ある出来事をきっかけに運命が大きく動き出す。

**目標**:
大切な何かを守るため、困難に立ち向かう決意をする。

**特技**:
- 諦めない心
- 仲間を引き寄せる魅力

---

💡 **Gemini APIキーを設定すると、より深いキャラクター設定が生成できます**`
  }

  private estimateTokens(text: string): number {
    // 簡易的なトークン推定（日本語の場合は約1.5文字=1トークン）
    return Math.ceil(text.length / 1.5)
  }

  private handleError(error: any): AIError {
    const aiError = new Error(error.message) as AIError
    aiError.provider = this.name
    aiError.statusCode = error.statusCode
    aiError.details = error.details
    
    if (error.statusCode === 401) {
      aiError.message = 'Invalid API key for GenSpark'
    } else if (error.statusCode === 429) {
      aiError.message = 'Rate limit exceeded for GenSpark'
    } else if (error.statusCode === 500) {
      aiError.message = 'GenSpark server error'
    }
    
    return aiError
  }
}
