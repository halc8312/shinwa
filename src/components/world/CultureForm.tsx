import { useState, useEffect } from 'react'
import { Culture } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface CultureFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (culture: Culture) => void
  culture?: Culture | null
}

export default function CultureForm({
  isOpen,
  onClose,
  onSave,
  culture
}: CultureFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    values: [''],
    customs: ['']
  })

  useEffect(() => {
    if (culture) {
      setFormData({
        name: culture.name,
        description: culture.description,
        values: culture.values.length > 0 ? culture.values : [''],
        customs: culture.customs.length > 0 ? culture.customs : ['']
      })
    } else {
      resetForm()
    }
  }, [culture, isOpen])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      values: [''],
      customs: ['']
    })
  }

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('名前と説明を入力してください')
      return
    }

    const cultureData: Culture = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      values: formData.values.filter(v => v.trim()),
      customs: formData.customs.filter(c => c.trim())
    }

    onSave(cultureData)
    handleClose()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addArrayItem = (field: 'values' | 'customs') => {
    setFormData({
      ...formData,
      [field]: [...formData[field], '']
    })
  }

  const updateArrayItem = (field: 'values' | 'customs', index: number, value: string) => {
    const newArray = [...formData[field]]
    newArray[index] = value
    setFormData({
      ...formData,
      [field]: newArray
    })
  }

  const removeArrayItem = (field: 'values' | 'customs', index: number) => {
    if (formData[field].length > 1) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index)
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={culture ? '文化を編集' : '新しい文化を追加'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <Input
          label="文化名（必須）"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例: エルフ族"
          disabled={!!culture}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            説明（必須）
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="この文化の特徴や概要を記述..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            価値観
          </label>
          {formData.values.map((value, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={value}
                onChange={(e) => updateArrayItem('values', index, e.target.value)}
                placeholder="例: 自然との調和"
              />
              {formData.values.length > 1 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeArrayItem('values', index)}
                >
                  削除
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addArrayItem('values')}
          >
            価値観を追加
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            習慣・伝統
          </label>
          {formData.customs.map((custom, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={custom}
                onChange={(e) => updateArrayItem('customs', index, e.target.value)}
                placeholder="例: 月の祭り"
              />
              {formData.customs.length > 1 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeArrayItem('customs', index)}
                >
                  削除
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addArrayItem('customs')}
          >
            習慣を追加
          </Button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>
            {culture ? '更新' : '作成'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}