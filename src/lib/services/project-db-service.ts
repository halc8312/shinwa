import { prisma } from '@/lib/prisma'
import { Project as DBProject, Prisma } from '@prisma/client'
import { Project, ProjectSettings } from '../types'
import { defaultWritingRules } from '@/data/rules/default-rules'

export class ProjectDBService {
  async getAllProjects(userId: string): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      where: { userId },
      include: { settings: true },
      orderBy: { updatedAt: 'desc' }
    })

    return projects.map(this.mapDBProjectToProject)
  }

  async getProject(id: string, userId: string): Promise<Project | null> {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: { settings: true }
    })

    if (!project) return null

    return this.mapDBProjectToProject(project)
  }

  async createProject(
    userId: string,
    data: {
      name: string
      description: string
      novelType?: 'short' | 'medium' | 'long' | 'custom'
      settings?: Partial<ProjectSettings>
    }
  ): Promise<Project> {
    const defaultSettings: ProjectSettings = {
      writingRules: data.settings?.writingRules || defaultWritingRules,
      worldSettings: data.settings?.worldSettings || {
        name: data.name + 'の世界',
        description: '',
        era: '現代',
        geography: [],
        cultures: []
      },
      aiSettings: data.settings?.aiSettings || {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4000,
        systemPrompt: '',
        customInstructions: []
      }
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        novelType: data.novelType || 'medium',
        userId,
        settings: {
          create: {
            writingRules: defaultSettings.writingRules as any,
            worldSettings: defaultSettings.worldSettings as any,
            aiSettings: defaultSettings.aiSettings as any
          }
        }
      },
      include: { settings: true }
    })

    return this.mapDBProjectToProject(project)
  }

  async updateProject(
    id: string,
    userId: string,
    updates: Partial<Project>
  ): Promise<Project | null> {
    try {
      const project = await prisma.project.update({
        where: { id, userId },
        data: {
          name: updates.name,
          description: updates.description,
          novelType: updates.novelType,
          updatedAt: new Date()
        },
        include: { settings: true }
      })

      return this.mapDBProjectToProject(project)
    } catch (error) {
      return null
    }
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.project.delete({
        where: { id, userId }
      })
      return true
    } catch (error) {
      return false
    }
  }

  async updateProjectSettings(
    id: string,
    userId: string,
    settings: Partial<ProjectSettings>
  ): Promise<Project | null> {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: { settings: true }
    })

    if (!project) return null

    const updatedSettings = await prisma.projectSettings.update({
      where: { projectId: id },
      data: {
        writingRules: settings.writingRules as any,
        worldSettings: settings.worldSettings as any,
        aiSettings: settings.aiSettings as any
      }
    })

    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: { settings: true }
    })

    return this.mapDBProjectToProject(updatedProject!)
  }

  private mapDBProjectToProject(dbProject: any): Project {
    return {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      novelType: dbProject.novelType as any,
      createdAt: dbProject.createdAt,
      updatedAt: dbProject.updatedAt,
      settings: dbProject.settings ? {
        writingRules: dbProject.settings.writingRules,
        worldSettings: dbProject.settings.worldSettings,
        aiSettings: dbProject.settings.aiSettings
      } : undefined
    }
  }
}

export const projectDBService = new ProjectDBService()