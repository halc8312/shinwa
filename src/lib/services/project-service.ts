import { Project, ProjectSettings, WritingRules, WorldSettings } from '../types'
import { generateId } from '../utils'
import { defaultWritingRules } from '@/data/rules/default-rules'

class ProjectService {
  private readonly STORAGE_KEY = 'shinwa-projects'

  async getAllProjects(): Promise<Project[]> {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return []
    
    try {
      const projects = JSON.parse(stored)
      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to load projects:', error)
      return []
    }
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getAllProjects()
    return projects.find(p => p.id === id) || null
  }

  async createProject(data: {
    name: string
    description: string
    novelType?: 'short' | 'medium' | 'long' | 'custom'
    settings?: Partial<ProjectSettings>
  }): Promise<Project> {
    const project: Project = {
      id: generateId(),
      name: data.name,
      description: data.description,
      novelType: data.novelType || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        writingRules: data.settings?.writingRules || defaultWritingRules,
        worldSettings: data.settings?.worldSettings || {
          name: data.name + 'の世界',
          description: '',
          era: '現代',
          geography: [],
          cultures: []
        },
        aiSettings: data.settings?.aiSettings || {
          model: 'gpt-4.1-mini',
          temperature: 0.7,
          maxTokens: 32768,
          systemPrompt: '',
          customInstructions: []
        }
      }
    }

    const projects = await this.getAllProjects()
    projects.push(project)
    this.saveProjects(projects)

    return project
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const projects = await this.getAllProjects()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) return null
    
    projects[index] = {
      ...projects[index],
      ...updates,
      id: projects[index].id,
      createdAt: projects[index].createdAt,
      updatedAt: new Date()
    }
    
    this.saveProjects(projects)
    return projects[index]
  }

  async deleteProject(id: string): Promise<boolean> {
    const projects = await this.getAllProjects()
    const filtered = projects.filter(p => p.id !== id)
    
    if (filtered.length === projects.length) return false
    
    this.saveProjects(filtered)
    
    // プロジェクトに関連するデータも削除
    this.deleteProjectData(id)
    
    return true
  }

  async duplicateProject(id: string, newName: string): Promise<Project | null> {
    const original = await this.getProject(id)
    if (!original) return null
    
    const duplicate = await this.createProject({
      name: newName,
      description: original.description,
      settings: original.settings
    })
    
    // 関連データもコピー（将来的に実装）
    
    return duplicate
  }

  private saveProjects(projects: Project[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects))
  }

  private deleteProjectData(projectId: string): void {
    if (typeof window === 'undefined') return
    
    // プロジェクトに関連するデータを削除
    const keysToDelete = [
      `shinwa-chapters-${projectId}`,
      `shinwa-characters-${projectId}`,
      `shinwa-world-${projectId}`,
      `shinwa-rules-${projectId}`,
      `shinwa-state-${projectId}`,
      `shinwa-chapter-structure-${projectId}`,
      `shinwa-project-meta-${projectId}`,
      `shinwa-ai-model-settings-${projectId}`
    ]
    
    keysToDelete.forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // プロジェクト設定の更新
  async updateProjectSettings(
    id: string, 
    settings: Partial<ProjectSettings>
  ): Promise<Project | null> {
    const project = await this.getProject(id)
    if (!project) return null
    
    return this.updateProject(id, {
      settings: {
        ...project.settings,
        ...settings
      }
    })
  }

  // 執筆ルールの更新
  async updateWritingRules(
    projectId: string,
    rules: Partial<WritingRules>
  ): Promise<Project | null> {
    const project = await this.getProject(projectId)
    if (!project) return null
    
    return this.updateProjectSettings(projectId, {
      writingRules: {
        ...project.settings.writingRules,
        ...rules
      }
    })
  }

  // 世界観設定の更新
  async updateWorldSettings(
    projectId: string,
    settings: Partial<WorldSettings>
  ): Promise<Project | null> {
    const project = await this.getProject(projectId)
    if (!project) return null
    
    return this.updateProjectSettings(projectId, {
      worldSettings: {
        ...project.settings.worldSettings,
        ...settings
      }
    })
  }
}

export const projectService = new ProjectService()