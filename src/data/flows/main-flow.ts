import { Flow } from '@/lib/types'

export const mainWritingFlow: Flow = {
  id: 'main-writing-flow',
  name: 'メイン執筆フロー',
  description: '章の執筆を行うための標準的なフロー',
  steps: [
    {
      id: 'load-project',
      name: 'プロジェクト情報の読み込み',
      type: 'read',
      input: ['projectInfo', 'projectMeta'],
      output: ['projectInfo', 'projectMeta'],
      action: 'プロジェクトの基本情報とメタ情報を読み込み',
      nextSteps: ['load-rules']
    },
    {
      id: 'load-rules',
      name: '執筆ルールの読み込み',
      type: 'read',
      input: ['writingRules'],
      output: ['rules'],
      action: 'プロジェクトの執筆ルールを読み込み、AIのコンテキストに設定',
      nextSteps: ['load-settings']
    },
    {
      id: 'load-settings',
      name: '設定ファイルの読み込み',
      type: 'read',
      input: ['worldSettings', 'characters', 'concepts'],
      output: ['settings'],
      action: '物語世界、キャラクター、独自概念の設定を読み込み',
      nextSteps: ['analyze-previous']
    },
    {
      id: 'analyze-previous',
      name: '前章の分析',
      type: 'analyze',
      input: ['previousChapter', 'previousState'],
      output: ['context'],
      action: '前章の内容と状態を分析し、継続性を確保',
      conditions: [
        {
          field: 'chapterNumber',
          operator: 'greater',
          value: 1
        }
      ],
      nextSteps: ['plan-chapter']
    },
    {
      id: 'plan-chapter',
      name: '章の構成計画',
      type: 'analyze',
      input: ['context', 'plotOutline', 'foreshadowing'],
      output: ['chapterPlan'],
      action: '章の展開、盛り込む要素、伏線の処理を計画',
      nextSteps: ['write-chapter']
    },
    {
      id: 'write-chapter',
      name: '本編執筆',
      type: 'write',
      input: ['chapterPlan', 'rules', 'settings'],
      output: ['chapterContent'],
      action: '計画に基づいて章の本文を執筆',
      nextSteps: ['validate-consistency']
    },
    {
      id: 'validate-consistency',
      name: '一貫性の検証',
      type: 'validate',
      input: ['chapterContent', 'settings', 'previousChapters'],
      output: ['validationResult'],
      action: 'キャラクターの行動、世界観、時系列の一貫性を検証',
      nextSteps: ['generate-background']
    },
    {
      id: 'generate-background',
      name: '裏側の出来事生成',
      type: 'write',
      input: ['chapterContent', 'settings', 'timeline'],
      output: ['backgroundEvents'],
      action: '章で描かれていない裏側で起きている出来事を生成',
      nextSteps: ['update-state']
    },
    {
      id: 'update-state',
      name: '状態更新',
      type: 'update',
      input: ['chapterContent', 'backgroundEvents', 'previousState', 'chapterPlan'],
      output: ['newState'],
      action: '物語世界の状態、キャラクターの状況、伏線の進行を更新',
      nextSteps: ['save-chapter']
    },
    {
      id: 'save-chapter',
      name: '章の保存',
      type: 'update',
      input: ['chapterContent', 'backgroundEvents', 'newState'],
      output: ['savedChapter'],
      action: '執筆した章と関連データを保存',
      nextSteps: []
    },
  ]
}