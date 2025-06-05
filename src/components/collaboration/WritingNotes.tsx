'use client'

import { useState, useEffect } from 'react'
import { generateId, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface WritingNote {
  id: string
  author: string
  content: string
  category: 'idea' | 'feedback' | 'question' | 'todo'
  chapterNumber?: number
  createdAt: Date
  resolved?: boolean
}

interface WritingNotesProps {
  projectId: string
  currentChapter?: number
}

export default function WritingNotes({ projectId, currentChapter }: WritingNotesProps) {
  const [notes, setNotes] = useState<WritingNote[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newNote, setNewNote] = useState({
    content: '',
    category: 'idea' as WritingNote['category'],
    chapterNumber: currentChapter
  })
  const [filterCategory, setFilterCategory] = useState<WritingNote['category'] | 'all'>('all')
  const [authorName, setAuthorName] = useState('')

  useEffect(() => {
    loadNotes()
    loadAuthorName()
  }, [projectId])

  const loadNotes = () => {
    const stored = localStorage.getItem(`shinwa-notes-${projectId}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      setNotes(parsed.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt)
      })))
    }
  }

  const loadAuthorName = () => {
    const stored = localStorage.getItem('shinwa-author-name')
    if (stored) {
      setAuthorName(stored)
    } else {
      const name = `執筆者${Math.floor(Math.random() * 1000)}`
      setAuthorName(name)
      localStorage.setItem('shinwa-author-name', name)
    }
  }

  const saveNotes = (updatedNotes: WritingNote[]) => {
    localStorage.setItem(`shinwa-notes-${projectId}`, JSON.stringify(updatedNotes))
    setNotes(updatedNotes)
  }

  const addNote = () => {
    if (!newNote.content.trim()) return

    const note: WritingNote = {
      id: generateId(),
      author: authorName,
      content: newNote.content,
      category: newNote.category,
      chapterNumber: newNote.chapterNumber,
      createdAt: new Date(),
      resolved: false
    }

    saveNotes([...notes, note])
    setNewNote({ content: '', category: 'idea', chapterNumber: currentChapter })
    setShowModal(false)
  }

  const toggleResolve = (noteId: string) => {
    const updated = notes.map(note => 
      note.id === noteId ? { ...note, resolved: !note.resolved } : note
    )
    saveNotes(updated)
  }

  const deleteNote = (noteId: string) => {
    if (window.confirm('このメモを削除してもよろしいですか？')) {
      saveNotes(notes.filter(note => note.id !== noteId))
    }
  }

  const filteredNotes = filterCategory === 'all' 
    ? notes 
    : notes.filter(note => note.category === filterCategory)

  const categoryIcons = {
    idea: '💡',
    feedback: '💬',
    question: '❓',
    todo: '📝'
  }

  const categoryColors = {
    idea: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700',
    feedback: 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700',
    question: 'bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700',
    todo: 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">📝 執筆メモ・共有ノート</h3>
        <Button size="sm" onClick={() => setShowModal(true)}>
          メモを追加
        </Button>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filterCategory === 'all' 
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' 
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          すべて ({notes.length})
        </button>
        {Object.entries(categoryIcons).map(([category, icon]) => {
          const count = notes.filter(n => n.category === category).length
          return (
            <button
              key={category}
              onClick={() => setFilterCategory(category as WritingNote['category'])}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterCategory === category 
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {icon} {category} ({count})
            </button>
          )
        })}
      </div>

      {/* メモリスト */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            メモがありません
          </p>
        ) : (
          filteredNotes
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(note => (
              <div
                key={note.id}
                className={`p-4 border rounded-lg ${categoryColors[note.category]} ${
                  note.resolved ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[note.category]}</span>
                    <span className="font-medium text-sm">{note.author}</span>
                    {note.chapterNumber && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                        第{note.chapterNumber}章
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                
                <p className={`text-sm mb-2 ${note.resolved ? 'line-through' : ''}`}>
                  {note.content}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleResolve(note.id)}
                    className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {note.resolved ? '未解決に戻す' : '解決済みにする'}
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* メモ追加モーダル */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="執筆メモを追加"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">カテゴリー</label>
            <select
              value={newNote.category}
              onChange={(e) => setNewNote({ ...newNote, category: e.target.value as WritingNote['category'] })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="idea">💡 アイデア</option>
              <option value="feedback">💬 フィードバック</option>
              <option value="question">❓ 質問</option>
              <option value="todo">📝 TODO</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">章番号（任意）</label>
            <input
              type="number"
              value={newNote.chapterNumber || ''}
              onChange={(e) => setNewNote({ ...newNote, chapterNumber: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="関連する章番号"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">内容</label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="メモの内容を入力..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              キャンセル
            </Button>
            <Button onClick={addNote} disabled={!newNote.content.trim()}>
              追加
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}