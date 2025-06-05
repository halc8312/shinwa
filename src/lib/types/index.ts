export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  settings: ProjectSettings
  novelType?: 'short' | 'medium' | 'long' | 'custom'
  chapterStructure?: ChapterStructure
}

export interface ProjectSettings {
  writingRules: WritingRules
  worldSettings: WorldSettings
  aiSettings: AISettings
}

export interface WritingRules {
  style: string
  chapterLength: {
    min: number
    max: number
  }
  pointOfView: 'first' | 'third' | 'omniscient'
  tense: 'past' | 'present'
  language: string
}

export interface WorldSettings {
  name: string
  description: string
  era: string
  geography: string[]
  cultures: Culture[]
  magicSystem?: MagicSystem
}

export interface Culture {
  name: string
  description: string
  values: string[]
  customs: string[]
}

export interface MagicSystem {
  name: string
  rules: string[]
  limitations: string[]
  sources: string[]
}

export interface Character {
  id: string
  name: string
  fullName?: string
  age?: number
  gender?: string
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'mentor' | 'love_interest' | 'rival' | 'main'
  occupation?: string
  appearance: string
  personality: string[]
  background: string
  goals: string[]
  relationships: Relationship[]
  arc: CharacterArc
  aliases?: string[]
}

export interface Relationship {
  characterId: string
  type: string
  description: string
  dynamic: string
}

export interface CharacterArc {
  start: string
  journey: string[]
  end: string
}

export interface Chapter {
  id: string
  number: number
  title: string
  summary: string
  content: string
  backgroundEvents: BackgroundEvent[]
  state: ChapterState
  createdAt: Date
  updatedAt: Date
}

export interface BackgroundEvent {
  id: string
  description: string
  characters: string[]
  impact: string
  visibility: 'hidden' | 'hinted' | 'revealed'
}

export interface ChapterState {
  time: string
  location: string
  charactersPresent: string[]
  plotProgress: PlotPoint[]
  worldChanges: string[]
  foreshadowing: Foreshadowing[]
}

export interface PlotPoint {
  id: string
  type: 'setup' | 'conflict' | 'climax' | 'resolution'
  description: string
  resolved: boolean
}

export interface Foreshadowing {
  id: string
  hint: string
  payoff: string
  chapterRevealed?: number
  status: 'planted' | 'reinforced' | 'revealed'
  // 拡張フィールド
  scope?: 'short' | 'medium' | 'long'  // 短期（1-3章）、中期（4-10章）、長期（11章以上）
  significance?: 'minor' | 'moderate' | 'major'  // 重要度
  plannedRevealChapter?: number  // 回収予定章
  relatedCharacters?: string[]  // 関連キャラクターID
  category?: 'character' | 'plot' | 'world' | 'mystery' | 'other'  // 伏線のカテゴリ
}

// 計画された伏線（章立て時に使用）
export interface PlannedForeshadowing {
  hint: string
  scope: 'short' | 'medium' | 'long'
  significance: 'minor' | 'moderate' | 'major'
  plannedRevealChapter?: number
  category?: 'character' | 'plot' | 'world' | 'mystery' | 'other'
}

// 章立て構造
export interface ChapterStructure {
  totalChapters: number
  structure: StoryStructure
  chapters: ChapterOutline[]
  tensionCurve?: TensionPoint[]
}

export interface StoryStructure {
  type: 'three-act' | 'four-act' | 'hero-journey' | 'custom'
  acts: Act[]
}

export interface Act {
  id: string
  name: string
  description: string
  startChapter: number
  endChapter: number
  purpose: string
  keyEvents: string[]
}

export interface ChapterOutline {
  number: number
  title?: string
  purpose: string  // この章の目的
  keyEvents: string[]  // 主要な出来事
  conflict?: string  // コンフリクト
  resolution?: string  // 解決
  hook?: string  // 次章への引き
  targetWordCount?: number
  tensionLevel?: number  // 1-10のテンションレベル
  notes?: string
  // 詳細情報
  charactersInvolved?: string[]  // 登場キャラクターID
  location?: string  // 場所
  time?: string  // 時間
  // 伏線情報
  foreshadowingToPlant?: PlannedForeshadowing[]  // この章で設置する伏線
  foreshadowingToReveal?: string[]  // この章で回収する伏線ID
}

export interface TensionPoint {
  chapter: number
  tension: number  // 0-100
  type: 'calm' | 'rising' | 'peak' | 'falling'
}

// 小説タイプ別の設定
export interface NovelTypeConfig {
  type: 'short' | 'medium' | 'long' | 'custom'
  name: string
  description: string
  wordCountRange: {
    min: number
    max: number
  }
  chapterCountRange: {
    min: number
    max: number
  }
  averageChapterLength: number
  recommendedStructure: StoryStructure['type']
}

export interface Flow {
  id: string
  name: string
  description: string
  steps: FlowStep[]
}

export interface FlowStep {
  id: string
  name: string
  type: 'read' | 'analyze' | 'write' | 'validate' | 'update'
  input: string[]
  output: string[]
  action: string
  conditions?: FlowCondition[]
  nextSteps: string[]
}

export interface FlowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less'
  value: any
}

export interface AISettings {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  customInstructions: string[]
}

// API設定（プロバイダーとキー）
export interface AIProviderSettings {
  provider: 'openai' | 'anthropic'
  apiKey: string
}

// 機能別AI設定
export interface AIModelSettings {
  // デフォルトモデル（設定されていない機能で使用）
  defaultModel: {
    model: string
    temperature: number
    maxTokens: number
  }
  // 章の執筆
  chapterWriting: {
    model: string
    temperature: number
    maxTokens: number
  }
  // 章の分析・計画
  chapterPlanning: {
    model: string
    temperature: number
    maxTokens: number
  }
  // 背景イベント生成
  backgroundEvents: {
    model: string
    temperature: number
    maxTokens: number
  }
  // 要約生成
  summarization: {
    model: string
    temperature: number
    maxTokens: number
  }
  // キャラクター分析
  characterAnalysis: {
    model: string
    temperature: number
    maxTokens: number
  }
  // 一貫性チェック
  validation: {
    model: string
    temperature: number
    maxTokens: number
  }
  // ダッシュボードAIアシスタント
  assistant: {
    model: string
    temperature: number
    maxTokens: number
  }
}

// Story State Management Types
export interface StoryState {
  projectId: string
  currentChapter: number
  timeline: Timeline
  characterStates: CharacterStateMap
  worldState: WorldState
  plotThreads: PlotThread[]
  foreshadowingTracker: ForeshadowingTracker
}

export interface Timeline {
  events: TimelineEvent[]
  currentDate: string
  daysPassed: number
  season?: string
  specialEvents: string[]
}

export interface TimelineEvent {
  id: string
  chapterNumber: number
  date: string
  time: string
  description: string
  involvedCharacters: string[]
  location: string
  significance: 'minor' | 'moderate' | 'major'
}

export interface CharacterStateMap {
  [characterId: string]: CharacterState
}

export interface CharacterState {
  characterId: string
  physicalState: {
    location: string
    health: string
    appearance: string[]
  }
  emotionalState: {
    mood: string
    relationships: { [characterId: string]: number } // -100 to 100
    recentEmotions: string[]
  }
  knowledge: string[]
  goals: {
    shortTerm: string[]
    longTerm: string[]
  }
  arcProgress: number // 0 to 100
  lastSeenChapter: number
}

export interface WorldState {
  politicalState: { [faction: string]: PoliticalStatus }
  economicState: EconomicState
  socialChanges: string[]
  environmentalChanges: string[]
  technologyLevel: string
  magicState?: MagicState
}

export interface PoliticalStatus {
  power: number // 0 to 100
  relationships: { [faction: string]: number } // -100 to 100
  currentLeader: string
  stability: 'stable' | 'unstable' | 'crisis'
}

export interface EconomicState {
  generalProsperity: 'poor' | 'struggling' | 'stable' | 'prosperous' | 'booming'
  tradeRoutes: string[]
  majorExports: string[]
  majorImports: string[]
  currency: string
}

export interface MagicState {
  ambientLevel: number // 0 to 100
  activeSpells: string[]
  magicalEvents: string[]
  restrictions: string[]
}

export interface PlotThread {
  id: string
  name: string
  description: string
  type: 'main' | 'subplot' | 'character' | 'world'
  status: 'setup' | 'developing' | 'climax' | 'resolving' | 'resolved'
  startChapter: number
  endChapter?: number
  milestones: PlotMilestone[]
  tensionLevel: number // 0 to 100
  dependencies: string[] // Other plot thread IDs
}

export interface PlotMilestone {
  id: string
  description: string
  chapterNumber: number
  achieved: boolean
  impact: 'minor' | 'moderate' | 'major'
}

export interface ForeshadowingTracker {
  planted: ForeshadowingItem[]
  reinforced: ForeshadowingItem[]
  revealed: ForeshadowingItem[]
  statistics: {
    averageChaptersToPayoff: number
    unrevealedCount: number
    revealedCount: number
  }
}

export interface ForeshadowingItem {
  foreshadowingId: string
  chapterPlanted: number
  chaptersReinforced: number[]
  chapterRevealed?: number
  significance: 'minor' | 'moderate' | 'major'
  relatedPlotThreads: string[]
}

export interface StateTransition {
  fromChapter: number
  toChapter: number
  changes: {
    characterChanges: CharacterChange[]
    worldChanges: WorldChange[]
    plotProgressions: PlotProgression[]
    timeAdvancement: TimeAdvancement
  }
}

export interface CharacterChange {
  characterId: string
  changeType: 'location' | 'emotion' | 'relationship' | 'knowledge' | 'goal' | 'arc'
  previousValue: any
  newValue: any
  reason: string
}

export interface WorldChange {
  changeType: 'political' | 'economic' | 'social' | 'environmental' | 'magical'
  description: string
  impact: 'minor' | 'moderate' | 'major'
  affectedLocations: string[]
}

export interface PlotProgression {
  plotThreadId: string
  previousStatus: string
  newStatus: string
  milestoneAchieved?: string
  tensionChange: number
}

export interface TimeAdvancement {
  timePassed: string
  newDate: string
  newTime: string
  significantEvents: string[]
}