import { useState, useEffect } from 'react'
import { Foreshadowing } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { generateId } from '@/lib/utils'
import { calculateForeshadowingScopeRanges } from '@/lib/utils/foreshadowing-utils'

interface ForeshadowingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (foreshadowing: Foreshadowing) => void
  foreshadowing?: Foreshadowing | null
  currentChapterNumber: number
  totalChapters?: number
}

export default function ForeshadowingModal({
  isOpen,
  onClose,
  onSave,
  foreshadowing,
  currentChapterNumber,
  totalChapters = 10
}: ForeshadowingModalProps) {
  const [formData, setFormData] = useState({
    hint: '',
    payoff: '',
    status: 'planted' as Foreshadowing['status'],
    chapterRevealed: '',
    scope: 'medium' as Foreshadowing['scope'],
    significance: 'moderate' as Foreshadowing['significance'],
    plannedRevealChapter: '',
    category: 'plot' as Foreshadowing['category']
  })
  
  // 動的スコープ範囲を計算
  const scopeRanges = calculateForeshadowingScopeRanges(totalChapters)

  useEffect(() => {
    if (foreshadowing) {
      setFormData({
        hint: foreshadowing.hint,
        payoff: foreshadowing.payoff,
        status: foreshadowing.status,
        chapterRevealed: foreshadowing.chapterRevealed?.toString() || '',
        scope: foreshadowing.scope || 'medium',
        significance: foreshadowing.significance || 'moderate',
        plannedRevealChapter: foreshadowing.plannedRevealChapter?.toString() || '',
        category: foreshadowing.category || 'plot'
      })
    } else {
      resetForm()
    }
  }, [foreshadowing, isOpen])

  const resetForm = () => {
    setFormData({
      hint: '',
      payoff: '',
      status: 'planted',
      chapterRevealed: '',
      scope: 'medium',
      significance: 'moderate',
      plannedRevealChapter: '',
      category: 'plot'
    })
  }

  const handleSubmit = () => {
    if (!formData.hint.trim()) {
      alert('伏線のヒントを入力してください')
      return
    }

    const foreshadowingData: Foreshadowing = {
      id: foreshadowing?.id || generateId(),
      hint: formData.hint.trim(),
      payoff: formData.payoff.trim(),
      status: formData.status,
      chapterRevealed: formData.chapterRevealed ? parseInt(formData.chapterRevealed) : undefined,
      scope: formData.scope,
      significance: formData.significance,
      plannedRevealChapter: formData.plannedRevealChapter ? parseInt(formData.plannedRevealChapter) : undefined,
      category: formData.category
    }

    onSave(foreshadowingData)
    handleClose()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={foreshadowing ? '伏線を編集' : '伏線を追加'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            伏線の内容（必須）
          </label>
          <textarea
            value={formData.hint}
            onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
            placeholder="読者に示すヒントや伏線となる描写..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            回収内容（必須）
          </label>
          <textarea
            value={formData.payoff}
            onChange={(e) => setFormData({ ...formData, payoff: e.target.value })}
            placeholder="この伏線がどのように回収されるか..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              状態
            </label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ 
                ...formData, 
                status: e.target.value as Foreshadowing['status'] 
              })}
              options={[
                { value: 'planted', label: '設置（初めて登場）' },
                { value: 'reinforced', label: '強化（再度言及）' },
                { value: 'revealed', label: '回収済み' }
              ]}
            />
          </div>

          <div>
            <Input
              label="回収章（任意）"
              type="number"
              value={formData.chapterRevealed}
              onChange={(e) => setFormData({ ...formData, chapterRevealed: e.target.value })}
              placeholder={`例: ${currentChapterNumber + 5}`}
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              スコープ
            </label>
            <Select
              value={formData.scope || 'medium'}
              onChange={(e) => setFormData({ 
                ...formData, 
                scope: e.target.value as Foreshadowing['scope'] 
              })}
              options={[
                { value: 'short', label: scopeRanges.short.label },
                { value: 'medium', label: scopeRanges.medium.label },
                { value: 'long', label: scopeRanges.long.label }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              重要度
            </label>
            <Select
              value={formData.significance || 'moderate'}
              onChange={(e) => setFormData({ 
                ...formData, 
                significance: e.target.value as Foreshadowing['significance'] 
              })}
              options={[
                { value: 'minor', label: '低' },
                { value: 'moderate', label: '中' },
                { value: 'major', label: '高' }
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="回収予定章"
              type="number"
              value={formData.plannedRevealChapter}
              onChange={(e) => setFormData({ ...formData, plannedRevealChapter: e.target.value })}
              placeholder={`例: ${currentChapterNumber + 3}`}
              min={currentChapterNumber + 1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カテゴリ
            </label>
            <Select
              value={formData.category || 'plot'}
              onChange={(e) => setFormData({ 
                ...formData, 
                category: e.target.value as Foreshadowing['category'] 
              })}
              options={[
                { value: 'character', label: 'キャラクター' },
                { value: 'plot', label: 'プロット' },
                { value: 'world', label: '世界観' },
                { value: 'mystery', label: 'ミステリー' },
                { value: 'other', label: 'その他' }
              ]}
            />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            伏線管理のヒント
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• 伏線は読者の興味を引きつける重要な要素です</li>
            <li>• 設置から回収まで適切な間隔を空けましょう</li>
            <li>• 複数の章で少しずつ強化することで印象を深められます</li>
            <li>• 回収時は読者が「なるほど！」と思える展開を心がけましょう</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>
            {foreshadowing ? '更新' : '追加'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}