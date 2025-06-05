import { Project } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function ProjectCard({ project, onDelete, onDuplicate }: ProjectCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">
          <Link 
            href={`/projects/${project.id}`}
            className="text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
          >
            {project.name}
          </Link>
        </h3>
        <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
          {project.description || '説明なし'}
        </p>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-500 mb-4 space-y-1">
        <p>作成日: {formatDate(project.createdAt)}</p>
        <p>更新日: {formatDate(project.updatedAt)}</p>
      </div>

      <div className="flex gap-2">
        <Link href={`/projects/${project.id}`}>
          <Button size="sm" variant="primary">
            開く
          </Button>
        </Link>
        <Link href={`/projects/${project.id}/settings`}>
          <Button size="sm" variant="secondary">
            設定
          </Button>
        </Link>
        {onDuplicate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDuplicate(project.id)}
          >
            複製
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
                onDelete(project.id)
              }
            }}
          >
            削除
          </Button>
        )}
      </div>
    </div>
  )
}