import { Chapter, BackgroundEvent, ChapterState, Foreshadowing } from '../types'
import { generateId } from '../utils'
import { SummaryService } from './summary-service'

class ChapterService {
  private getStorageKey(projectId: string): string {
    return `shinwa-chapters-${projectId}`
  }

  async getChapters(projectId: string): Promise<Chapter[]> {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.getStorageKey(projectId))
    if (!stored) return []
    
    try {
      const chapters = JSON.parse(stored)
      return chapters.map((ch: any) => ({
        ...ch,
        createdAt: new Date(ch.createdAt),
        updatedAt: new Date(ch.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to load chapters:', error)
      return []
    }
  }

  async getChapter(projectId: string, chapterId: string): Promise<Chapter | null> {
    const chapters = await this.getChapters(projectId)
    return chapters.find(ch => ch.id === chapterId) || null
  }

  async createChapter(projectId: string, data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
    const chapter: Chapter = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 要約が提供されていない場合は自動生成を試みる
    if (!chapter.summary && chapter.content) {
      try {
        const summaryService = new SummaryService(projectId)
        chapter.summary = await summaryService.generateChapterSummary(chapter)
      } catch (error) {
        console.error('Failed to generate summary:', error)
        chapter.summary = chapter.content.substring(0, 200) + '...'
      }
    }

    const chapters = await this.getChapters(projectId)
    chapters.push(chapter)
    this.saveChapters(projectId, chapters)

    return chapter
  }

  async updateChapter(
    projectId: string,
    chapterId: string,
    updates: Partial<Chapter>
  ): Promise<Chapter | null> {
    const chapters = await this.getChapters(projectId)
    const index = chapters.findIndex(ch => ch.id === chapterId)
    
    if (index === -1) return null
    
    chapters[index] = {
      ...chapters[index],
      ...updates,
      id: chapters[index].id,
      createdAt: chapters[index].createdAt,
      updatedAt: new Date()
    }
    
    this.saveChapters(projectId, chapters)
    return chapters[index]
  }

  async deleteChapter(projectId: string, chapterId: string): Promise<boolean> {
    const chapters = await this.getChapters(projectId)
    const filtered = chapters.filter(ch => ch.id !== chapterId)
    
    if (filtered.length === chapters.length) return false
    
    // 章番号を再調整
    const renumbered = filtered.map((ch, index) => ({
      ...ch,
      number: index + 1
    }))
    
    this.saveChapters(projectId, renumbered)
    return true
  }

  // 背景イベントの追加
  async addBackgroundEvent(
    projectId: string,
    chapterId: string,
    event: Omit<BackgroundEvent, 'id'>
  ): Promise<Chapter | null> {
    const chapter = await this.getChapter(projectId, chapterId)
    if (!chapter) return null

    const newEvent: BackgroundEvent = {
      ...event,
      id: generateId()
    }

    return this.updateChapter(projectId, chapterId, {
      backgroundEvents: [...chapter.backgroundEvents, newEvent]
    })
  }

  // 背景イベントの更新
  async updateBackgroundEvent(
    projectId: string,
    chapterId: string,
    eventId: string,
    updates: Partial<BackgroundEvent>
  ): Promise<Chapter | null> {
    const chapter = await this.getChapter(projectId, chapterId)
    if (!chapter) return null

    const updatedEvents = chapter.backgroundEvents.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    )

    return this.updateChapter(projectId, chapterId, {
      backgroundEvents: updatedEvents
    })
  }

  // 背景イベントの削除
  async removeBackgroundEvent(
    projectId: string,
    chapterId: string,
    eventId: string
  ): Promise<Chapter | null> {
    const chapter = await this.getChapter(projectId, chapterId)
    if (!chapter) return null

    return this.updateChapter(projectId, chapterId, {
      backgroundEvents: chapter.backgroundEvents.filter(e => e.id !== eventId)
    })
  }

  // 伏線の追加
  async addForeshadowing(
    projectId: string,
    chapterId: string,
    foreshadowing: Omit<Foreshadowing, 'id'>
  ): Promise<Chapter | null> {
    const chapter = await this.getChapter(projectId, chapterId)
    if (!chapter) return null

    const newForeshadowing: Foreshadowing = {
      ...foreshadowing,
      id: generateId()
    }

    const updatedState: ChapterState = {
      ...chapter.state,
      foreshadowing: [...chapter.state.foreshadowing, newForeshadowing]
    }

    return this.updateChapter(projectId, chapterId, {
      state: updatedState
    })
  }

  // 伏線の更新
  async updateForeshadowing(
    projectId: string,
    chapterId: string,
    foreshadowingId: string,
    updates: Partial<Foreshadowing>
  ): Promise<Chapter | null> {
    const chapter = await this.getChapter(projectId, chapterId)
    if (!chapter) return null

    const updatedForeshadowing = chapter.state.foreshadowing.map(f =>
      f.id === foreshadowingId ? { ...f, ...updates } : f
    )

    const updatedState: ChapterState = {
      ...chapter.state,
      foreshadowing: updatedForeshadowing
    }

    return this.updateChapter(projectId, chapterId, {
      state: updatedState
    })
  }

  // 章の内容を要約
  async summarizeChapter(content: string, maxLength: number = 200): Promise<string> {
    // シンプルな要約（最初の段落を取得）
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    if (paragraphs.length === 0) return ''
    
    const firstParagraph = paragraphs[0]
    if (firstParagraph.length <= maxLength) return firstParagraph
    
    return firstParagraph.substring(0, maxLength) + '...'
  }

  // 章の統計情報
  getChapterStats(chapter: Chapter) {
    const content = chapter.content
    const characterCount = content.replace(/\s/g, '').length
    const wordCount = content.trim().split(/\s+/).length
    const paragraphCount = content.split('\n\n').filter(p => p.trim()).length
    
    return {
      characterCount,
      wordCount,
      paragraphCount,
      backgroundEventCount: chapter.backgroundEvents.length,
      foreshadowingCount: chapter.state.foreshadowing.length
    }
  }

  private saveChapters(projectId: string, chapters: Chapter[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(chapters))
  }
}

export const chapterService = new ChapterService()