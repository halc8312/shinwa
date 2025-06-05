import { useState, useEffect } from 'react'
import { Foreshadowing } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { generateId } from '@/lib/utils'

interface ForeshadowingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (foreshadowing: Foreshadowing) => void
  foreshadowing?: Foreshadowing | null
  currentChapterNumber: number
}

export default function ForeshadowingModal({
  isOpen,
  onClose,
  onSave,
  foreshadowing,
  currentChapterNumber
}: ForeshadowingModalProps) {
  const [formData, setFormData] = useState({
    hint: '',
    payoff: '',
    status: 'planted' as Foreshadowing['status'],
    chapterRevealed: ''
  })

  useEffect(() => {
    if (foreshadowing) {
      setFormData({
        hint: foreshadowing.hint,
        payoff: foreshadowing.payoff,
        status: foreshadowing.status,
        chapterRevealed: foreshadowing.chapterRevealed?.toString() || ''
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
      chapterRevealed: ''
    })
  }

  const handleSubmit = () => {
    if (!formData.hint.trim() || !formData.payoff.trim()) {
      alert('伏線とその回収内容を入力してください')
      return
    }

    const foreshadowingData: Foreshadowing = {
      id: foreshadowing?.id || generateId(),
      hint: formData.hint.trim(),
      payoff: formData.payoff.trim(),
      status: formData.status,
      chapterRevealed: formData.chapterRevealed ? parseInt(formData.chapterRevealed) : undefined
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