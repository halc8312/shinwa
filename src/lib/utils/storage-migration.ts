/**
 * ストレージマイグレーション
 * グローバルストアから章データを削除し、プロジェクト別管理に移行
 */
export function migrateStorage() {
  try {
    // グローバルストアのデータを取得
    const storedData = localStorage.getItem('shinwa-storage')
    if (!storedData) return

    const data = JSON.parse(storedData)
    
    // stateプロパティが存在し、chaptersが含まれている場合
    if (data.state && data.state.chapters) {
      // chaptersプロパティを削除
      delete data.state.chapters
      
      // 更新されたデータを保存
      localStorage.setItem('shinwa-storage', JSON.stringify(data))
    }
  } catch (error) {
    console.error('Storage migration failed:', error)
  }
}