import { NovelTypeConfig } from '@/lib/types'

export const NOVEL_TYPE_CONFIGS: Record<string, NovelTypeConfig> = {
  short: {
    type: 'short',
    name: '短編小説',
    description: '1万字以内の短い物語。1〜3章程度で完結する作品に適しています。',
    wordCountRange: {
      min: 2000,
      max: 10000
    },
    chapterCountRange: {
      min: 1,
      max: 3
    },
    averageChapterLength: 3000,
    recommendedStructure: 'three-act'
  },
  medium: {
    type: 'medium',
    name: '中編小説',
    description: '1〜5万字程度の物語。5〜10章程度で展開する作品に適しています。',
    wordCountRange: {
      min: 10000,
      max: 50000
    },
    chapterCountRange: {
      min: 5,
      max: 10
    },
    averageChapterLength: 5000,
    recommendedStructure: 'three-act'
  },
  long: {
    type: 'long',
    name: '長編小説',
    description: '5万字以上の本格的な物語。10章以上で展開する大作に適しています。',
    wordCountRange: {
      min: 50000,
      max: 300000
    },
    chapterCountRange: {
      min: 10,
      max: 50
    },
    averageChapterLength: 6000,
    recommendedStructure: 'four-act'
  },
  custom: {
    type: 'custom',
    name: 'カスタム',
    description: '自由に章数や文字数を設定できます。',
    wordCountRange: {
      min: 1000,
      max: 500000
    },
    chapterCountRange: {
      min: 1,
      max: 100
    },
    averageChapterLength: 5000,
    recommendedStructure: 'custom'
  }
}

// 物語構造のテンプレート
export const STORY_STRUCTURE_TEMPLATES = {
  'three-act': {
    type: 'three-act' as const,
    name: '三幕構成',
    description: '序盤・中盤・終盤の3つの幕で構成される最も基本的な構造',
    actTemplates: [
      {
        name: '第一幕：設定',
        description: '物語の世界観、主人公、問題提起を行う',
        percentageOfStory: 25,
        purpose: '読者を物語に引き込み、主人公の目的と障害を明確にする',
        keyEvents: ['導入', '日常の提示', '事件の発生', '第一の転換点']
      },
      {
        name: '第二幕：対立',
        description: '主人公が障害に直面し、成長していく',
        percentageOfStory: 50,
        purpose: '物語の中核となる対立と葛藤を展開し、緊張を高める',
        keyEvents: ['新たな世界', '試練と失敗', '中間点', '最大の危機']
      },
      {
        name: '第三幕：解決',
        description: 'クライマックスと結末',
        percentageOfStory: 25,
        purpose: '全ての伏線を回収し、感動的な結末へ導く',
        keyEvents: ['第二の転換点', 'クライマックス', '解決', 'エピローグ']
      }
    ]
  },
  'four-act': {
    type: 'four-act' as const,
    name: '四幕構成',
    description: '起承転結の4つの幕で構成される構造',
    actTemplates: [
      {
        name: '起：導入',
        description: '物語の世界観と人物紹介',
        percentageOfStory: 20,
        purpose: '読者の興味を引き、物語の方向性を示す',
        keyEvents: ['世界観の提示', '主人公の紹介', '日常の描写', '事件の予兆']
      },
      {
        name: '承：展開',
        description: '物語が本格的に動き出す',
        percentageOfStory: 30,
        purpose: '問題を複雑化し、主人公の目的を明確にする',
        keyEvents: ['事件の発生', '仲間との出会い', '最初の対立', '目的の明確化']
      },
      {
        name: '転：転換',
        description: '予想外の展開と最大の危機',
        percentageOfStory: 30,
        purpose: '物語に大きな転換をもたらし、緊張を最高潮に',
        keyEvents: ['裏切り', '真実の発覚', '最大の試練', 'どん底']
      },
      {
        name: '結：結末',
        description: 'すべての解決と余韻',
        percentageOfStory: 20,
        purpose: '感動的なクライマックスと満足感のある結末',
        keyEvents: ['最終決戦', '伏線回収', '問題解決', '新たな日常']
      }
    ]
  },
  'hero-journey': {
    type: 'hero-journey' as const,
    name: 'ヒーローズジャーニー',
    description: '英雄の旅路を描く12段階の構造',
    actTemplates: [
      {
        name: '出発',
        description: '日常世界から冒険への旅立ち',
        percentageOfStory: 25,
        purpose: '主人公の成長の起点を描く',
        keyEvents: ['日常世界', '冒険への召命', '召命の拒否', '賢者との出会い']
      },
      {
        name: '試練',
        description: '未知の世界での試練と成長',
        percentageOfStory: 35,
        purpose: '主人公の変化と成長を描く',
        keyEvents: ['第一関門', '仲間・敵・師匠', '最深部への接近', '最大の試練']
      },
      {
        name: '帰還',
        description: '変化した主人公の帰還',
        percentageOfStory: 25,
        purpose: '成長の証明と新たな世界の構築',
        keyEvents: ['報酬', '帰路', '復活', '帰還']
      },
      {
        name: '新生',
        description: '変化した世界での新たな生活',
        percentageOfStory: 15,
        purpose: '物語の意味と主人公の成長を確認',
        keyEvents: ['霊薬を持っての帰還', '二つの世界の導師', '自由な生活']
      }
    ]
  }
}