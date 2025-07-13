'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project, Chapter, Character } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { chapterService } from '@/lib/services/chapter-service'
import { characterService } from '@/lib/services/character-service'
import Button from '@/components/ui/Button'
import BackgroundEventModal from '@/components/chapter/BackgroundEventModal'
import ForeshadowingModal from '@/components/chapter/ForeshadowingModal'
import { formatDate, countCharacters } from '@/lib/utils'
import { BackgroundEvent, Foreshadowing } from '@/lib/types'

export default function ChapterDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const chapterId = params.chapterId as string

  const [project, setProject] = useState<Project | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [activeTab, setActiveTab] = useState<'content' | 'background' | 'state' | 'foreshadowing'>('content')
  const [isSaving, setIsSaving] = useState(false)
  
  // 背景イベント関連の状態
  const [showBackgroundEventModal, setShowBackgroundEventModal] = useState(false)
  const [editingBackgroundEvent, setEditingBackgroundEvent] = useState<BackgroundEvent | null>(null)
  
  // 伏線関連の状態
  const [showForeshadowingModal, setShowForeshadowingModal] = useState(false)
  const [editingForeshadowing, setEditingForeshadowing] = useState<Foreshadowing | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId, chapterId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedProject, loadedChapter, loadedCharacters] = await Promise.all([
        projectService.getProject(projectId),
        chapterService.getChapter(projectId, chapterId),
        characterService.getCharacters(projectId)
      ])

      if (!loadedProject || !loadedChapter) {
        router.push(`/projects/${projectId}`)
        return
      }

      setProject(loadedProject)
      setChapter(loadedChapter)
      setCharacters(loadedCharacters)
      setEditContent(loadedChapter.content)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveContent = async () => {
    if (!chapter) return

    setIsSaving(true)
    try {
      const updated = await chapterService.updateChapter(projectId, chapterId, {
        content: editContent
      })
      if (updated) {
        setChapter(updated)
        setIsEditing(false)
        alert('保存しました')
      }
    } catch (error) {
      console.error('Failed to save chapter:', error)
      alert('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTitle = async () => {
    if (!chapter) return

    const newTitle = prompt('新しいタイトルを入力してください:', chapter.title)
    if (!newTitle || newTitle === chapter.title) return

    try {
      const updated = await chapterService.updateChapter(projectId, chapterId, {
        title: newTitle
      })
      if (updated) {
        setChapter(updated)
      }
    } catch (error) {
      console.error('Failed to update title:', error)
    }
  }

  // 背景イベント関連のハンドラー
  const handleSaveBackgroundEvent = async (event: BackgroundEvent) => {
    if (!chapter) return

    try {
      let updated: Chapter | null
      if (editingBackgroundEvent) {
        // 更新
        updated = await chapterService.updateBackgroundEvent(
          projectId,
          chapterId,
          event.id,
          event
        )
      } else {
        // 新規追加
        updated = await chapterService.addBackgroundEvent(
          projectId,
          chapterId,
          event
        )
      }
      
      if (updated) {
        setChapter(updated)
        setShowBackgroundEventModal(false)
        setEditingBackgroundEvent(null)
      }
    } catch (error) {
      console.error('Failed to save background event:', error)
    }
  }

  const handleEditBackgroundEvent = (event: BackgroundEvent) => {
    setEditingBackgroundEvent(event)
    setShowBackgroundEventModal(true)
  }

  const handleDeleteBackgroundEvent = async (eventId: string) => {
    if (!chapter || !window.confirm('この背景イベントを削除しますか？')) return

    try {
      const updated = await chapterService.removeBackgroundEvent(projectId, chapterId, eventId)
      if (updated) {
        setChapter(updated)
      }
    } catch (error) {
      console.error('Failed to delete background event:', error)
    }
  }

  // 伏線関連のハンドラー
  const handleSaveForeshadowing = async (foreshadowing: Foreshadowing) => {
    if (!chapter) return

    try {
      let updated: Chapter | null
      if (editingForeshadowing) {
        // 更新
        updated = await chapterService.updateForeshadowing(
          projectId,
          chapterId,
          foreshadowing.id,
          foreshadowing
        )
      } else {
        // 新規追加
        updated = await chapterService.addForeshadowing(
          projectId,
          chapterId,
          foreshadowing
        )
      }
      
      if (updated) {
        setChapter(updated)
        setShowForeshadowingModal(false)
        setEditingForeshadowing(null)
      }
    } catch (error) {
      console.error('Failed to save foreshadowing:', error)
    }
  }

  const handleEditForeshadowing = (foreshadowing: Foreshadowing) => {
    setEditingForeshadowing(foreshadowing)
    setShowForeshadowingModal(true)
  }

  const handleDeleteForeshadowing = async (foreshadowingId: string) => {
    if (!chapter || !window.confirm('この伏線を削除しますか？')) return

    try {
      const updatedForeshadowing = chapter.state.foreshadowing.filter(f => f.id !== foreshadowingId)
      const updated = await chapterService.updateChapter(projectId, chapterId, {
        state: {
          ...chapter.state,
          foreshadowing: updatedForeshadowing
        }
      })
      
      if (updated) {
        setChapter(updated)
      }
    } catch (error) {
      console.error('Failed to delete foreshadowing:', error)
    }
  }

  if (isLoading || !project || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  const stats = chapterService.getChapterStats(chapter)
  const presentCharacters = characters.filter(char => 
    chapter.state.charactersPresent.includes(char.id)
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* ヘッダー */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <nav className="text-xs sm:text-sm mb-3 sm:mb-4 overflow-x-auto whitespace-nowrap">
            <Link href="/projects" className="text-blue-600 hover:underline">
              プロジェクト一覧
            </Link>
            <span className="mx-1 sm:mx-2 text-gray-500">/</span>
            <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>
            <span className="mx-1 sm:mx-2 text-gray-500">/</span>
            <span className="text-gray-700 dark:text-gray-300">{chapter.title}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white line-clamp-1">
                  {chapter.title}
                </h1>
                <button
                  onClick={handleUpdateTitle}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="タイトルを編集"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <span>第{chapter.number}章</span>
                <span>{countCharacters(chapter.content)}文字</span>
                <span className="hidden sm:inline">作成: {formatDate(chapter.createdAt)}</span>
                <span className="hidden sm:inline">更新: {formatDate(chapter.updatedAt)}</span>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              {activeTab === 'content' && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                  size="sm"
                  className="sm:text-base"
                >
                  編集
                </Button>
              )}
              <Link href={`/projects/${projectId}`}>
                <Button variant="secondary" size="sm" className="sm:text-base">
                  <span className="hidden sm:inline">プロジェクトに戻る</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 sm:mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === 'content'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              本文
            </button>
            <button
              onClick={() => setActiveTab('background')}
              className={`px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === 'background'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">背景イベント</span>
              <span className="sm:hidden">背景</span>
              {chapter.backgroundEvents.length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {chapter.backgroundEvents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('state')}
              className={`px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === 'state'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">章の状態</span>
              <span className="sm:hidden">状態</span>
            </button>
            <button
              onClick={() => setActiveTab('foreshadowing')}
              className={`px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === 'foreshadowing'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              伏線
              {chapter.state.foreshadowing.length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {chapter.state.foreshadowing.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* 本文タブ */}
            {activeTab === 'content' && (
              <div>
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-[600px] p-4 font-serif text-lg leading-relaxed border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {countCharacters(editContent)}文字
                      </span>
                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditContent(chapter.content)
                            setIsEditing(false)
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          onClick={handleSaveContent}
                          disabled={isSaving}
                        >
                          {isSaving ? '保存中...' : '保存'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none dark:prose-invert">
                    <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
                      {chapter.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 背景イベントタブ */}
            {activeTab === 'background' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">背景イベント</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingBackgroundEvent(null)
                      setShowBackgroundEventModal(true)
                    }}
                  >
                    イベントを追加
                  </Button>
                </div>

                {chapter.backgroundEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    背景イベントがありません
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chapter.backgroundEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-gray-900 dark:text-white flex-1 mr-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.visibility === 'hidden'
                                ? 'bg-gray-100 text-gray-700'
                                : event.visibility === 'hinted'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {event.visibility === 'hidden' ? '隠れている' :
                               event.visibility === 'hinted' ? '示唆されている' : '明らかになった'}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditBackgroundEvent(event)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="編集"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteBackgroundEvent(event.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          影響: {event.impact}
                        </p>
                        {event.characters.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">関連キャラクター: </span>
                            {event.characters.map((charId, index) => {
                              const char = characters.find(c => c.id === charId)
                              return (
                                <span key={charId} className="text-sm text-blue-600">
                                  {char?.name || 'Unknown'}
                                  {index < event.characters.length - 1 && ', '}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 章の状態タブ */}
            {activeTab === 'state' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">基本情報</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500 mb-1">時間</dt>
                        <dd className="flex items-center gap-2">
                          <span className="font-medium">{chapter.state.time || '未設定'}</span>
                          <button
                            onClick={async () => {
                              const newTime = prompt('時間を設定してください:', chapter.state.time || '')
                              if (newTime !== null) {
                                const updated = await chapterService.updateChapter(projectId, chapterId, {
                                  state: {
                                    ...chapter.state,
                                    time: newTime || '未設定'
                                  }
                                })
                                if (updated) {
                                  setChapter(updated)
                                }
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="時間を編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500 mb-1">場所</dt>
                        <dd className="flex items-center gap-2">
                          <span className="font-medium">{chapter.state.location || '未設定'}</span>
                          <button
                            onClick={async () => {
                              const newLocation = prompt('場所を設定してください:', chapter.state.location || '')
                              if (newLocation !== null) {
                                const updated = await chapterService.updateChapter(projectId, chapterId, {
                                  state: {
                                    ...chapter.state,
                                    location: newLocation || '未設定'
                                  }
                                })
                                if (updated) {
                                  setChapter(updated)
                                }
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="場所を編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium">登場キャラクター</h3>
                      <button
                        onClick={async () => {
                          const availableCharacters = characters.filter(
                            c => !chapter.state.charactersPresent.includes(c.id)
                          )
                          if (availableCharacters.length === 0) {
                            alert('追加できるキャラクターがありません')
                            return
                          }
                          
                          const characterNames = availableCharacters.map(c => c.name).join('\n')
                          const selectedName = prompt(
                            `追加するキャラクターを選択してください:\n${characterNames}`,
                            availableCharacters[0].name
                          )
                          
                          if (selectedName) {
                            const selectedChar = availableCharacters.find(c => c.name === selectedName)
                            if (selectedChar) {
                              const updated = await chapterService.updateChapter(projectId, chapterId, {
                                state: {
                                  ...chapter.state,
                                  charactersPresent: [...chapter.state.charactersPresent, selectedChar.id]
                                }
                              })
                              if (updated) {
                                setChapter(updated)
                              }
                            }
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + キャラクター追加
                      </button>
                    </div>
                    {presentCharacters.length === 0 ? (
                      <p className="text-gray-500">登場キャラクターなし</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {presentCharacters.map((char) => (
                          <div
                            key={char.id}
                            className="group relative px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                          >
                            <Link
                              href={`/projects/${projectId}/characters`}
                              className="hover:underline"
                            >
                              {char.name}
                            </Link>
                            <button
                              onClick={async () => {
                                if (window.confirm(`${char.name}をこの章から削除しますか？`)) {
                                  const updated = await chapterService.updateChapter(projectId, chapterId, {
                                    state: {
                                      ...chapter.state,
                                      charactersPresent: chapter.state.charactersPresent.filter(id => id !== char.id)
                                    }
                                  })
                                  if (updated) {
                                    setChapter(updated)
                                  }
                                }
                              }}
                              className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">プロットの進行</h3>
                  {chapter.state.plotProgress.length === 0 ? (
                    <p className="text-gray-500">プロットポイントなし</p>
                  ) : (
                    <div className="space-y-2">
                      {chapter.state.plotProgress.map((plot) => (
                        <div key={plot.id} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            plot.resolved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {plot.resolved ? '✓' : '•'}
                          </span>
                          <span className="text-sm">{plot.description}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {plot.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {chapter.state.worldChanges.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">世界の変化</h3>
                    <ul className="space-y-1">
                      {chapter.state.worldChanges.map((change, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-sm">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 伏線タブ */}
            {activeTab === 'foreshadowing' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">伏線管理</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingForeshadowing(null)
                      setShowForeshadowingModal(true)
                    }}
                  >
                    伏線を追加
                  </Button>
                </div>

                {chapter.state.foreshadowing.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    伏線がありません
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chapter.state.foreshadowing.map((foreshadow) => (
                      <div
                        key={foreshadow.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 mr-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              伏線: {foreshadow.hint}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              回収: {foreshadow.payoff}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              foreshadow.status === 'planted'
                                ? 'bg-blue-100 text-blue-700'
                                : foreshadow.status === 'reinforced'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {foreshadow.status === 'planted' ? '設置' :
                               foreshadow.status === 'reinforced' ? '強化' : '回収済み'}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditForeshadowing(foreshadow)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="編集"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteForeshadowing(foreshadow.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        {foreshadow.chapterRevealed && (
                          <p className="text-xs text-gray-500 mt-2">
                            第{foreshadow.chapterRevealed}章で回収
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* サイドバー統計情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {/* メインコンテンツエリア（上記のタブコンテンツ） */}
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-medium mb-3">統計情報</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">文字数</dt>
                  <dd className="font-medium">{stats.characterCount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">段落数</dt>
                  <dd className="font-medium">{stats.paragraphCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">背景イベント</dt>
                  <dd className="font-medium">{stats.backgroundEventCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">伏線</dt>
                  <dd className="font-medium">{stats.foreshadowingCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* 背景イベントモーダル */}
        <BackgroundEventModal
          isOpen={showBackgroundEventModal}
          onClose={() => {
            setShowBackgroundEventModal(false)
            setEditingBackgroundEvent(null)
          }}
          onSave={handleSaveBackgroundEvent}
          event={editingBackgroundEvent}
          characters={characters}
        />

        {/* 伏線モーダル */}
        <ForeshadowingModal
          isOpen={showForeshadowingModal}
          onClose={() => {
            setShowForeshadowingModal(false)
            setEditingForeshadowing(null)
          }}
          onSave={handleSaveForeshadowing}
          foreshadowing={editingForeshadowing}
          currentChapterNumber={chapter.number}
          totalChapters={project.chapterStructure?.totalChapters}
        />
      </div>
    </div>
  )
}