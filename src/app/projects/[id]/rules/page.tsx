'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project, WritingRules } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { defaultWritingRules, writingGuidelines } from '@/data/rules/default-rules'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

export default function WritingRulesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [rules, setRules] = useState<WritingRules>(defaultWritingRules)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'style' | 'guidelines'>('basic')
  const [customRules, setCustomRules] = useState<string[]>([])
  const [newCustomRule, setNewCustomRule] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const loadedProject = await projectService.getProject(projectId)
      if (!loadedProject) {
        router.push('/projects')
        return
      }

      setProject(loadedProject)
      setRules(loadedProject.settings.writingRules)
      
      // カスタムルールを読み込み
      const storedCustomRules = localStorage.getItem(`shinwa-custom-rules-${projectId}`)
      if (storedCustomRules) {
        setCustomRules(JSON.parse(storedCustomRules))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRules = async () => {
    if (!project) return

    setIsSaving(true)
    try {
      const updated = await projectService.updateWritingRules(projectId, rules)
      if (updated) {
        setProject(updated)
        localStorage.setItem(`shinwa-custom-rules-${projectId}`, JSON.stringify(customRules))
        alert('執筆ルールを保存しました')
      }
    } catch (error) {
      console.error('Failed to save rules:', error)
      alert('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCustomRule = () => {
    if (newCustomRule.trim()) {
      setCustomRules([...customRules, newCustomRule.trim()])
      setNewCustomRule('')
    }
  }

  const handleRemoveCustomRule = (index: number) => {
    setCustomRules(customRules.filter((_, i) => i !== index))
  }

  const handleResetToDefault = () => {
    if (window.confirm('デフォルトの執筆ルールに戻しますか？カスタマイズした内容は失われます。')) {
      setRules(defaultWritingRules)
      setCustomRules([])
    }
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <nav className="text-sm mb-4">
            <Link href="/projects" className="text-blue-600 hover:underline">
              プロジェクト一覧
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-gray-700 dark:text-gray-300">執筆ルール</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                執筆ルール設定
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {project.name} の執筆スタイルとルールを設定します
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleResetToDefault}
            >
              デフォルトに戻す
            </Button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="overflow-x-auto">
            <div className="flex border-b border-gray-200 dark:border-gray-700 min-w-max">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'basic'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                基本設定
              </button>
              <button
                onClick={() => setActiveTab('style')}
                className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'style'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                文体・スタイル
              </button>
              <button
                onClick={() => setActiveTab('guidelines')}
                className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'guidelines'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                執筆ガイドライン
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* 基本設定タブ */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      視点
                    </label>
                    <Select
                      value={rules.pointOfView}
                      onChange={(e) => setRules({ 
                        ...rules, 
                        pointOfView: e.target.value as WritingRules['pointOfView'] 
                      })}
                      options={[
                        { value: 'first', label: '一人称' },
                        { value: 'third', label: '三人称' },
                        { value: 'omniscient', label: '神視点' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      時制
                    </label>
                    <Select
                      value={rules.tense}
                      onChange={(e) => setRules({ 
                        ...rules, 
                        tense: e.target.value as WritingRules['tense'] 
                      })}
                      options={[
                        { value: 'past', label: '過去形' },
                        { value: 'present', label: '現在形' }
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">章の文字数</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="最小文字数"
                      type="number"
                      value={rules.chapterLength.min}
                      onChange={(e) => setRules({
                        ...rules,
                        chapterLength: {
                          ...rules.chapterLength,
                          min: parseInt(e.target.value) || 0
                        }
                      })}
                      min="100"
                      step="100"
                    />
                    <Input
                      label="最大文字数"
                      type="number"
                      value={rules.chapterLength.max}
                      onChange={(e) => setRules({
                        ...rules,
                        chapterLength: {
                          ...rules.chapterLength,
                          max: parseInt(e.target.value) || 0
                        }
                      })}
                      min="100"
                      step="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    言語
                  </label>
                  <Select
                    value={rules.language}
                    onChange={(e) => setRules({ ...rules, language: e.target.value })}
                    options={[
                      { value: 'ja', label: '日本語' },
                      { value: 'en', label: '英語' },
                      { value: 'zh', label: '中国語' },
                      { value: 'ko', label: '韓国語' }
                    ]}
                  />
                </div>
              </div>
            )}

            {/* 文体・スタイルタブ */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    文体ルール
                  </label>
                  <textarea
                    value={rules.style}
                    onChange={(e) => setRules({ ...rules, style: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={10}
                    placeholder="執筆時の文体に関するルールを記述..."
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">カスタムルール</h3>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newCustomRule}
                      onChange={(e) => setNewCustomRule(e.target.value)}
                      placeholder="例: 専門用語は初出時に説明を加える"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRule()}
                    />
                    <Button onClick={handleAddCustomRule} disabled={!newCustomRule.trim()}>
                      追加
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {customRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm">{rule}</span>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveCustomRule(index)}
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                    {customRules.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        カスタムルールはまだ追加されていません
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 執筆ガイドラインタブ */}
            {activeTab === 'guidelines' && (
              <div className="space-y-6">
                {Object.entries(writingGuidelines).map(([key, guideline]) => (
                  <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">{guideline.description}</h3>
                    <ul className="space-y-2">
                      {guideline.rules.map((rule, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2 mt-0.5">•</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Button onClick={handleSaveRules} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}