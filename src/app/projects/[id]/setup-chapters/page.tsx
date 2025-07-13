'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project, ChapterStructure } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import ChapterStructureSetup from '@/components/project/ChapterStructureSetup'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function SetupChaptersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [projectMeta, setProjectMeta] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [skipSetup, setSkipSetup] = useState(false)

  useEffect(() => {
    loadProject()
    loadProjectMeta()
  }, [projectId])

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const loaded = await projectService.getProject(projectId)
      if (!loaded) {
        router.push('/projects')
        return
      }
      setProject(loaded)
    } catch (error) {
      console.error('Failed to load project:', error)
      router.push('/projects')
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectMeta = () => {
    const stored = localStorage.getItem(`shinwa-project-meta-${projectId}`)
    if (stored) {
      try {
        setProjectMeta(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load project meta:', error)
      }
    }
  }

  const handleComplete = async (structure: ChapterStructure, novelType: string) => {
    // プロジェクトに小説タイプと章立てを保存
    if (project) {
      const updatedProject = {
        ...project,
        novelType: novelType as any,
        chapterStructure: structure
      }
      
      await projectService.updateProject(projectId, updatedProject)
    }
    
    // プロジェクトページへ遷移
    router.push(`/projects/${projectId}`)
  }

  const handleSkip = () => {
    // 章立て設定をスキップしてプロジェクトページへ
    router.push(`/projects/${projectId}`)
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                章立ての設定
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {project.name}の物語構成を設計しましょう
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleSkip}
            >
              スキップして後で設定
            </Button>
          </div>
          
          {/* 説明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
              📚 章立てを事前に設計するメリット
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• 物語全体の流れを把握し、一貫性のある展開を作れます</li>
              <li>• 適切なペース配分で読者を引き込む構成を実現できます</li>
              <li>• 伏線の設置と回収を計画的に行えます</li>
              <li>• AIが各章の文脈を理解し、より良い文章を生成できます</li>
            </ul>
          </div>
        </div>

        {/* 章立て設定コンポーネント */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ChapterStructureSetup
            projectId={projectId}
            projectName={project.name}
            projectDescription={project.description}
            genre={projectMeta?.genre}
            themes={projectMeta?.themes}
            plotOutline={projectMeta?.plotOutline}
            onComplete={handleComplete}
          />
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>章立ては後からいつでも編集できます</p>
        </div>
      </div>
    </div>
  )
}