'use client'

import { useState, useEffect } from 'react'
import { ChapterStructure, ChapterOutline, NovelTypeConfig } from '@/lib/types'
import { NOVEL_TYPE_CONFIGS, STORY_STRUCTURE_TEMPLATES } from '@/lib/config/novel-types'
import { ChapterStructureService } from '@/lib/services/chapter-structure-service'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ForeshadowingMap from '@/components/chapter/ForeshadowingMap'

interface ChapterStructureSetupProps {
  projectId: string
  projectName: string
  projectDescription: string
  genre?: string
  themes?: string[]
  plotOutline?: string
  onComplete: (structure: ChapterStructure, novelType: string) => void
}

export default function ChapterStructureSetup({
  projectId,
  projectName,
  projectDescription,
  genre = 'ファンタジー',
  themes = [],
  plotOutline,
  onComplete
}: ChapterStructureSetupProps) {
  const [novelType, setNovelType] = useState<string>('medium')
  const [structureType, setStructureType] = useState<string>('three-act')
  const [isGenerating, setIsGenerating] = useState(false)
  const [chapterStructure, setChapterStructure] = useState<ChapterStructure | null>(null)
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [customChapterCount, setCustomChapterCount] = useState(10)
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasExistingStructure, setHasExistingStructure] = useState(false)

  const novelTypeOptions = Object.entries(NOVEL_TYPE_CONFIGS).map(([key, config]) => ({
    value: key,
    label: `${config.name} (${config.chapterCountRange.min}〜${config.chapterCountRange.max}章)`
  }))

  const structureOptions = Object.entries(STORY_STRUCTURE_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: `${template.name} - ${template.description}`
  }))

  // 既存の章立てを読み込む
  useEffect(() => {
    const service = new ChapterStructureService(projectId)
    const existingStructure = service.loadChapterStructure(projectId)
    
    if (existingStructure) {
      setChapterStructure(existingStructure)
      setHasExistingStructure(true)
      setIsEditMode(true)
      
      // 既存の設定を復元
      const projectData = JSON.parse(localStorage.getItem(`shinwa-project-${projectId}`) || '{}')
      if (projectData.novelType) {
        setNovelType(projectData.novelType)
      }
      if (existingStructure.structure?.type) {
        setStructureType(existingStructure.structure.type)
      }
    }
  }, [projectId])

  useEffect(() => {
    // 小説タイプに応じて推奨構造を設定（新規作成時のみ）
    if (!hasExistingStructure) {
      const config = NOVEL_TYPE_CONFIGS[novelType]
      if (config) {
        setStructureType(config.recommendedStructure)
      }
    }
  }, [novelType, hasExistingStructure])

  const handleGenerateStructure = async () => {
    setIsGenerating(true)
    
    try {
      const service = new ChapterStructureService(projectId)
      const config = NOVEL_TYPE_CONFIGS[novelType]
      
      // カスタムの場合は章数を調整
      if (novelType === 'custom') {
        config.chapterCountRange = {
          min: customChapterCount,
          max: customChapterCount
        }
      }
      
      const structure = await service.generateChapterStructure({
        projectName,
        description: projectDescription,
        genre,
        themes,
        novelType: config,
        structureType: structureType as any,
        plotOutline
      })
      
      setChapterStructure(structure)
    } catch (error) {
      console.error('Failed to generate chapter structure:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateChapter = (chapterNumber: number, updates: Partial<ChapterOutline>) => {
    if (!chapterStructure) return
    
    const updatedChapters = [...chapterStructure.chapters]
    const index = updatedChapters.findIndex(ch => ch.number === chapterNumber)
    
    if (index !== -1) {
      updatedChapters[index] = {
        ...updatedChapters[index],
        ...updates
      }
      
      setChapterStructure({
        ...chapterStructure,
        chapters: updatedChapters
      })
    }
  }

  const handleComplete = () => {
    if (chapterStructure) {
      // 章立てを保存
      const service = new ChapterStructureService(projectId)
      service.saveChapterStructure(projectId, chapterStructure)
      
      onComplete(chapterStructure, novelType)
    }
  }

  const renderTensionGraph = () => {
    if (!chapterStructure?.tensionCurve) return null
    
    const maxTension = 100
    const graphHeight = 120
    
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">テンション曲線</h4>
        <div className="relative h-32">
          <svg className="w-full h-full">
            {/* グリッド線 */}
            {[0, 25, 50, 75, 100].map(level => (
              <line
                key={level}
                x1="0"
                y1={graphHeight - (level / maxTension) * graphHeight}
                x2="100%"
                y2={graphHeight - (level / maxTension) * graphHeight}
                stroke="#e5e7eb"
                strokeDasharray="2,2"
              />
            ))}
            
            {/* テンション曲線 */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={chapterStructure.tensionCurve.map((point, index) => {
                const x = (index / (chapterStructure.tensionCurve!.length - 1)) * 100
                const y = graphHeight - (point.tension / maxTension) * graphHeight
                return `${x}%,${y}`
              }).join(' ')}
            />
            
            {/* データポイント */}
            {chapterStructure.tensionCurve.map((point, index) => {
              const x = (index / (chapterStructure.tensionCurve!.length - 1)) * 100
              const y = graphHeight - (point.tension / maxTension) * graphHeight
              
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill={
                    point.type === 'peak' ? '#ef4444' :
                    point.type === 'calm' ? '#10b981' :
                    '#3b82f6'
                  }
                  className="cursor-pointer"
                >
                  <title>第{point.chapter}章: テンション{point.tension}</title>
                </circle>
              )
            })}
          </svg>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            静寂
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            通常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            クライマックス
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 既存の章立てがある場合のヘッダー */}
      {hasExistingStructure && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                既存の章立てが見つかりました
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                全{chapterStructure?.totalChapters}章 • {chapterStructure?.structure?.type && STORY_STRUCTURE_TEMPLATES[chapterStructure.structure.type as keyof typeof STORY_STRUCTURE_TEMPLATES]?.name}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsEditMode(false)
                setChapterStructure(null)
              }}
            >
              新規作成
            </Button>
          </div>
        </div>
      )}

      {/* 編集モードでない場合は新規作成UI */}
      {!isEditMode && (
        <>
          {/* 小説タイプ選択 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">小説の規模を選択</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(NOVEL_TYPE_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setNovelType(key)}
              className={`p-4 rounded-lg border-2 transition-all ${
                novelType === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <h4 className="font-medium mb-1">{config.name}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {config.wordCountRange.min.toLocaleString()}〜
                {config.wordCountRange.max.toLocaleString()}字
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {config.chapterCountRange.min}〜{config.chapterCountRange.max}章
              </p>
            </button>
          ))}
        </div>
        
        {novelType === 'custom' && (
          <div className="mt-4">
            <Input
              label="章数"
              type="number"
              min="1"
              max="100"
              value={customChapterCount}
              onChange={(e) => setCustomChapterCount(parseInt(e.target.value) || 1)}
            />
          </div>
        )}
      </div>

      {/* 構造選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          物語構造
        </label>
        <Select
          value={structureType}
          onChange={(e) => setStructureType(e.target.value)}
          options={structureOptions}
        />
      </div>

      {/* 生成ボタン */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateStructure}
          disabled={isGenerating}
          className="px-8"
        >
          {isGenerating ? 'AIが章立てを生成中...' : '章立てを生成'}
        </Button>
      </div>

      {/* 生成された章立て */}
      {chapterStructure && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">生成された章立て</h3>
            
            {/* テンション曲線 */}
            {renderTensionGraph()}
            
            {/* 伏線マップ */}
            <div className="mt-6">
              <ForeshadowingMap chapterStructure={chapterStructure} />
            </div>
            
            {/* 幕構成 */}
            <div className="mt-6 space-y-3">
              {chapterStructure.structure.acts.map((act, index) => (
                <div key={act.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">{act.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {act.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    第{act.startChapter}章〜第{act.endChapter}章
                  </p>
                </div>
              ))}
            </div>
            
            {/* 章一覧 */}
            <div className="mt-6 space-y-2">
              <h4 className="font-medium mb-3">章の詳細</h4>
              {chapterStructure.chapters.map((chapter) => (
                <div
                  key={chapter.number}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">
                          第{chapter.number}章
                          {chapter.title && `: ${chapter.title}`}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          (chapter.tensionLevel ?? 5) >= 8 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : (chapter.tensionLevel ?? 5) <= 3
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          テンション: {chapter.tensionLevel ?? 5}/10
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>目的:</strong> {chapter.purpose}
                      </p>
                      
                      {chapter.keyEvents.length > 0 && (
                        <div className="text-sm mb-2">
                          <strong>主要イベント:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {chapter.keyEvents.map((event, i) => (
                              <li key={i} className="text-gray-600 dark:text-gray-400">
                                {event}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {chapter.conflict && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>葛藤:</strong> {chapter.conflict}
                        </p>
                      )}
                      
                      {chapter.hook && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>次章への引き:</strong> {chapter.hook}
                        </p>
                      )}
                      
                      {/* 新しいフィールドの表示 */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {chapter.location && (
                            <p className="text-gray-600 dark:text-gray-400">
                              <strong>場所:</strong> {chapter.location}
                            </p>
                          )}
                          {chapter.time && (
                            <p className="text-gray-600 dark:text-gray-400">
                              <strong>時間:</strong> {chapter.time}
                            </p>
                          )}
                        </div>
                        
                        {chapter.charactersInvolved && chapter.charactersInvolved.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <strong>登場キャラクター:</strong> {chapter.charactersInvolved.join('、')}
                          </p>
                        )}
                        
                        {chapter.foreshadowingToPlant && chapter.foreshadowingToPlant.length > 0 && (
                          <div className="text-sm mt-2">
                            <strong>設置する伏線:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {chapter.foreshadowingToPlant.map((f, i) => (
                                <li key={i} className="text-gray-600 dark:text-gray-400">
                                  {f.hint} 
                                  <span className="text-xs ml-1">
                                    ({f.scope === 'short' ? '短期' : f.scope === 'medium' ? '中期' : '長期'}, 
                                    重要度: {f.significance === 'minor' ? '低' : f.significance === 'moderate' ? '中' : '高'})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {chapter.foreshadowingToReveal && chapter.foreshadowingToReveal.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <strong>回収する伏線:</strong> {chapter.foreshadowingToReveal.join('、')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingChapter(chapter.number)}
                    >
                      編集
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 完了ボタン */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleComplete}
                size="lg"
                className="px-12"
              >
                この章立てで開始
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* 編集モードの場合は既存の章立てを表示 */}
      {isEditMode && chapterStructure && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">章立ての確認・編集</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (confirm('現在の章立てをAIで再生成しますか？')) {
                    await handleGenerateStructure()
                  }
                }}
                disabled={isGenerating}
              >
                {isGenerating ? 'AIが再生成中...' : 'AIで再生成'}
              </Button>
            </div>
          </div>
          
          {/* テンション曲線 */}
          {renderTensionGraph()}
          
          {/* 伏線マップ */}
          <div className="mt-6">
            <ForeshadowingMap chapterStructure={chapterStructure} />
          </div>
          
          {/* 幕構成 */}
          <div className="mt-6 space-y-3">
            <h4 className="font-medium mb-3">幕構成</h4>
            {chapterStructure.structure.acts.map((act, index) => (
              <div key={act.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2">{act.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {act.description}
                </p>
                <p className="text-sm text-gray-500">
                  第{act.startChapter}章〜第{act.endChapter}章
                </p>
              </div>
            ))}
          </div>
          
          {/* 章一覧 */}
          <div className="mt-6 space-y-2">
            <h4 className="font-medium mb-3">章の詳細</h4>
            {chapterStructure.chapters.map((chapter) => (
              <div
                key={chapter.number}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setEditingChapter(chapter.number)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">
                        第{chapter.number}章
                        {chapter.title && `: ${chapter.title}`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        (chapter.tensionLevel ?? 5) >= 8 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : (chapter.tensionLevel ?? 5) <= 3
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}>
                        テンション: {chapter.tensionLevel ?? 5}/10
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>目的:</strong> {chapter.purpose}
                    </p>
                    
                    {chapter.keyEvents.length > 0 && (
                      <div className="text-sm mb-2">
                        <strong>主要イベント:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {chapter.keyEvents.slice(0, 3).map((event, i) => (
                            <li key={i} className="text-gray-600 dark:text-gray-400">
                              {event}
                            </li>
                          ))}
                          {chapter.keyEvents.length > 3 && (
                            <li className="text-gray-500 italic">
                              他{chapter.keyEvents.length - 3}件...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingChapter(chapter.number)
                    }}
                  >
                    編集
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleComplete}
              size="lg"
              className="px-12"
            >
              この章立てで保存
            </Button>
          </div>
        </div>
      )}

      {/* 章編集モーダル */}
      {editingChapter && chapterStructure && (
        <ChapterEditModal
          chapter={chapterStructure.chapters.find(ch => ch.number === editingChapter)!}
          isOpen={true}
          onClose={() => setEditingChapter(null)}
          onSave={(updates) => {
            handleUpdateChapter(editingChapter, updates)
            setEditingChapter(null)
          }}
        />
      )}
    </div>
  )
}

// 章編集モーダル
function ChapterEditModal({ 
  chapter, 
  isOpen, 
  onClose, 
  onSave 
}: {
  chapter: ChapterOutline
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<ChapterOutline>) => void
}) {
  const [formData, setFormData] = useState<Partial<ChapterOutline>>({
    title: chapter.title || '',
    purpose: chapter.purpose,
    keyEvents: chapter.keyEvents,
    conflict: chapter.conflict || '',
    resolution: chapter.resolution || '',
    hook: chapter.hook || '',
    tensionLevel: chapter.tensionLevel || 5,
    notes: chapter.notes || '',
    // 新しいフィールド
    location: chapter.location || '',
    time: chapter.time || '',
    charactersInvolved: chapter.charactersInvolved || [],
    foreshadowingToPlant: chapter.foreshadowingToPlant || [],
    foreshadowingToReveal: chapter.foreshadowingToReveal || []
  })

  const handleSubmit = () => {
    onSave(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`第${chapter.number}章の編集`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <Input
          label="章タイトル（任意）"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            章の目的
          </label>
          <textarea
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            rows={2}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            主要イベント（改行区切り）
          </label>
          <textarea
            value={formData.keyEvents?.join('\n') || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              keyEvents: e.target.value.split('\n').filter(line => line.trim()) 
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            rows={4}
          />
        </div>
        
        <Input
          label="葛藤・障害"
          value={formData.conflict || ''}
          onChange={(e) => setFormData({ ...formData, conflict: e.target.value })}
        />
        
        <Input
          label="次章への引き"
          value={formData.hook || ''}
          onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            テンションレベル ({formData.tensionLevel}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.tensionLevel}
            onChange={(e) => setFormData({ ...formData, tensionLevel: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            メモ（任意）
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            rows={3}
          />
        </div>
        
        {/* 新しいフィールド */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">詳細設定</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="場所"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="例: 王城の謁見室"
            />
            
            <Input
              label="時間"
              value={formData.time || ''}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              placeholder="例: 早朝、3日後"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              登場キャラクター（改行区切り）
            </label>
            <textarea
              value={formData.charactersInvolved?.join('\n') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                charactersInvolved: e.target.value.split('\n').filter(line => line.trim()) 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              rows={3}
              placeholder="キャラクター名を改行で区切って入力"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  )
}