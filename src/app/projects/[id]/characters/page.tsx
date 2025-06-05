'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Character, Project } from '@/lib/types'
import { characterService } from '@/lib/services/character-service'
import { projectService } from '@/lib/services/project-service'
import CharacterCard from '@/components/character/CharacterCard'
import CharacterForm from '@/components/character/CharacterForm'
import CharacterDetailModal from '@/components/character/CharacterDetailModal'
import RelationshipManager from '@/components/character/RelationshipManager'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function CharactersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [relationshipCharacter, setRelationshipCharacter] = useState<Character | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created'>('name')

  useEffect(() => {
    loadData()
  }, [projectId])

  useEffect(() => {
    filterAndSortCharacters()
  }, [characters, searchQuery, sortBy])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedProject, loadedCharacters] = await Promise.all([
        projectService.getProject(projectId),
        characterService.getCharacters(projectId)
      ])

      if (!loadedProject) {
        router.push('/projects')
        return
      }

      setProject(loadedProject)
      setCharacters(loadedCharacters)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortCharacters = () => {
    let filtered = characters

    if (searchQuery) {
      filtered = characters.filter(char =>
        char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.background.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      return 0 // 作成日でのソートは後で実装
    })

    setFilteredCharacters(sorted)
  }

  const handleCreateCharacter = async (characterData: Omit<Character, 'id'>) => {
    try {
      const newCharacter = await characterService.createCharacter(projectId, characterData)
      setCharacters([...characters, newCharacter])
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create character:', error)
    }
  }

  const handleUpdateCharacter = async (characterData: Omit<Character, 'id'>) => {
    if (!editingCharacter) return

    try {
      const updated = await characterService.updateCharacter(
        projectId,
        editingCharacter.id,
        characterData
      )
      if (updated) {
        setCharacters(characters.map(c => c.id === updated.id ? updated : c))
        setEditingCharacter(null)
        setShowForm(false)
      }
    } catch (error) {
      console.error('Failed to update character:', error)
    }
  }

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const success = await characterService.deleteCharacter(projectId, characterId)
      if (success) {
        setCharacters(characters.filter(c => c.id !== characterId))
      }
    } catch (error) {
      console.error('Failed to delete character:', error)
    }
  }

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character)
    setShowForm(true)
  }

  const handleViewDetails = (character: Character) => {
    setDetailCharacter(character)
  }

  const handleManageRelationships = (character: Character) => {
    setRelationshipCharacter(character)
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
            <span className="text-gray-700 dark:text-gray-300">キャラクター管理</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                キャラクター管理
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {project.name} のキャラクターを管理します
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingCharacter(null)
                setShowForm(true)
              }}
            >
              新規キャラクター
            </Button>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="キャラクターを検索..."
                type="search"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created')}
              className="rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">名前順</option>
              <option value="created">作成日順</option>
            </select>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {filteredCharacters.length} / {characters.length} キャラクター
          </div>
        </div>

        {/* キャラクター一覧 */}
        {filteredCharacters.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            {characters.length === 0 ? (
              <>
                <svg
                  className="w-24 h-24 mx-auto mb-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  キャラクターがありません
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  最初のキャラクターを作成して、物語に命を吹き込みましょう。
                </p>
                <Button
                  onClick={() => {
                    setEditingCharacter(null)
                    setShowForm(true)
                  }}
                  size="lg"
                >
                  最初のキャラクターを作成
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400">
                  検索条件に一致するキャラクターが見つかりませんでした。
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={handleEditCharacter}
                onDelete={handleDeleteCharacter}
                onViewDetails={handleViewDetails}
                onManageRelationships={handleManageRelationships}
              />
            ))}
          </div>
        )}

        {/* フォームモーダル */}
        <CharacterForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingCharacter(null)
          }}
          onSave={editingCharacter ? handleUpdateCharacter : handleCreateCharacter}
          character={editingCharacter || undefined}
          projectId={projectId}
        />

        {/* 詳細モーダル */}
        <CharacterDetailModal
          isOpen={!!detailCharacter}
          onClose={() => setDetailCharacter(null)}
          character={detailCharacter}
          projectId={projectId}
          onEdit={handleEditCharacter}
        />

        {/* 関係性管理モーダル */}
        {relationshipCharacter && (
          <RelationshipManager
            isOpen={!!relationshipCharacter}
            onClose={() => setRelationshipCharacter(null)}
            character={relationshipCharacter}
            projectId={projectId}
            onUpdate={() => {
              loadData()
              setRelationshipCharacter(null)
            }}
          />
        )}
      </div>
    </div>
  )
}