'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import ProjectCard from '@/components/project/ProjectCard'
import CreateProjectModal from '@/components/project/CreateProjectModal'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import AISettings, { AISettingsData } from '@/components/settings/AISettings'
import { useAppStore } from '@/lib/store'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const { setCurrentProvider, setApiKey } = useAppStore()

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const loadedProjects = await projectService.getAllProjects()
      setProjects(loadedProjects)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await projectService.deleteProject(id)
      await loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleDuplicate = async (id: string) => {
    const project = projects.find(p => p.id === id)
    if (!project) return

    const newName = prompt('複製後のプロジェクト名を入力してください:', `${project.name} (コピー)`)
    if (!newName) return

    try {
      await projectService.duplicateProject(id, newName)
      await loadProjects()
    } catch (error) {
      console.error('Failed to duplicate project:', error)
    }
  }

  const handleAISettingsSave = (settings: AISettingsData) => {
    setCurrentProvider(settings.provider)
    setApiKey(settings.provider, settings.apiKey)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-grow max-w-7xl mx-auto px-4 py-6 sm:py-8 w-full">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              プロジェクト一覧
            </h1>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowAISettings(true)}
              >
                AI設定
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="sm:text-base"
              >
                新規プロジェクト
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            小説プロジェクトを管理します。プロジェクトを選択して執筆を開始しましょう。
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
            <svg
              className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              プロジェクトがありません
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              最初のプロジェクトを作成して、小説の執筆を始めましょう。
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="md"
              className="sm:text-lg sm:px-6 sm:py-3"
            >
              最初のプロジェクトを作成
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}

        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadProjects}
        />

        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          onSave={handleAISettingsSave}
        />
      </div>
      <Footer />
    </div>
  )
}