import React, { useState } from 'react'
import { ValidationIssue, ValidationResult } from '@/lib/types'
import Button from '@/components/ui/Button'

interface ValidationIssueSelectorProps {
  validationResult: ValidationResult
  onFixSelected: (selectedIssueIds: string[]) => void
  onFixAll: () => void
  onDismiss: () => void
}

const categoryIcons: Record<ValidationIssue['category'], string> = {
  'word-count': '📏',
  'dialogue': '💬',
  'consistency': '🔗',
  'travel': '🗺️',
  'character': '👤',
  'plot': '📖',
  'rule': '📋',
  'other': '❓'
}

const categoryLabels: Record<ValidationIssue['category'], string> = {
  'word-count': '文字数',
  'dialogue': '会話文',
  'consistency': '一貫性',
  'travel': '移動',
  'character': 'キャラクター',
  'plot': 'プロット',
  'rule': 'ルール',
  'other': 'その他'
}

const severityColors = {
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200'
}

const severityLabels = {
  error: 'エラー',
  warning: '警告',
  info: '情報'
}

export default function ValidationIssueSelector({
  validationResult,
  onFixSelected,
  onFixAll,
  onDismiss
}: ValidationIssueSelectorProps) {
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())

  const toggleIssue = (issueId: string) => {
    const newSelected = new Set(selectedIssues)
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId)
    } else {
      newSelected.add(issueId)
    }
    setSelectedIssues(newSelected)
  }

  const toggleAll = () => {
    if (selectedIssues.size === validationResult.issues.length) {
      setSelectedIssues(new Set())
    } else {
      setSelectedIssues(new Set(validationResult.issues.map(issue => issue.id)))
    }
  }

  const handleFixSelected = () => {
    if (selectedIssues.size > 0) {
      onFixSelected(Array.from(selectedIssues))
    }
  }

  // カテゴリごとにグループ化
  const groupedIssues = validationResult.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = []
    }
    acc[issue.category].push(issue)
    return acc
  }, {} as Record<ValidationIssue['category'], ValidationIssue[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          検証結果 ({validationResult.issues.length}件の問題)
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleAll}
          >
            {selectedIssues.size === validationResult.issues.length ? 'すべて解除' : 'すべて選択'}
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(groupedIssues).map(([category, issues]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span>{categoryIcons[category as ValidationIssue['category']]}</span>
              <span>{categoryLabels[category as ValidationIssue['category']]}</span>
              <span className="text-xs text-gray-500">({issues.length}件)</span>
            </h4>
            
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`border rounded-lg p-3 ${severityColors[issue.severity]} dark:bg-opacity-20`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 cursor-pointer"
                      checked={selectedIssues.has(issue.id)}
                      onChange={() => toggleIssue(issue.id)}
                    />
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[issue.severity]}`}>
                          {severityLabels[issue.severity]}
                        </span>
                        <h5 className="font-medium text-sm">{issue.title}</h5>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {issue.description}
                      </p>
                      
                      {issue.suggestion && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                          <span className="font-medium">提案: </span>
                          {issue.suggestion}
                        </div>
                      )}
                      
                      {issue.location && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono">
                          <span className="font-medium">該当箇所: </span>
                          {issue.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIssues.size > 0 && (
            <span>{selectedIssues.size}件を選択中</span>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onDismiss}
          >
            無視して保存
          </Button>
          
          <Button
            variant="secondary"
            onClick={onFixAll}
          >
            すべて修正して再生成
          </Button>
          
          <Button
            onClick={handleFixSelected}
            disabled={selectedIssues.size === 0}
          >
            選択した項目を修正 ({selectedIssues.size}件)
          </Button>
        </div>
      </div>
    </div>
  )
}