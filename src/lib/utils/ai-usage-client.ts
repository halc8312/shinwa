/**
 * Client-side utilities for AI usage management
 */

export interface AIUsageStats {
  plan: string;
  isUnlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
  periodEnd?: Date;
}

export interface CanGenerateResult {
  canGenerate: boolean;
  remaining: number;
  isUnlimited: boolean;
}

/**
 * Check if user can generate AI content
 */
export async function checkAIUsage(): Promise<CanGenerateResult> {
  try {
    const response = await fetch('/api/ai-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to check AI usage');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking AI usage:', error);
    // Default to allowing generation to avoid blocking users
    return { canGenerate: true, remaining: -1, isUnlimited: true };
  }
}

/**
 * Record AI usage after successful generation
 */
export async function recordAIUsage(): Promise<AIUsageStats | null> {
  try {
    const response = await fetch('/api/ai-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to record AI usage');
    }
    
    const { stats } = await response.json();
    return stats;
  } catch (error) {
    console.error('Error recording AI usage:', error);
    return null;
  }
}

/**
 * Get current AI usage statistics
 */
export async function getAIUsageStats(): Promise<AIUsageStats | null> {
  try {
    const response = await fetch('/api/ai-usage');
    
    if (!response.ok) {
      throw new Error('Failed to get AI usage stats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting AI usage stats:', error);
    return null;
  }
}