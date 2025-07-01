import { prisma } from '@/lib/prisma';
import { SubscriptionService } from './subscription-service';

export class AIUsageService {
  private static readonly FREE_PLAN_LIMIT = 10;

  /**
   * 現在の使用期間を取得または作成
   */
  static async getCurrentPeriod(userId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // 現在の期間の使用状況を取得
      let usage = await prisma.aIUsage.findFirst({
        where: {
          userId,
          periodStart: { lte: now },
          periodEnd: { gt: now },
        },
      });

      // 存在しない場合は新規作成
      if (!usage) {
        usage = await prisma.aIUsage.create({
          data: {
            userId,
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
            chapterGenCount: 0,
          },
        });
      }

      return usage;
    } catch (error: any) {
      console.error('Failed to get AI usage period:', error);
      
      // テーブルが存在しない場合は、仮のオブジェクトを返す
      if (error.message?.includes('does not exist') || error.code === 'P2021') {
        console.warn('AIUsage table not found. Returning default usage.');
        return {
          id: 'temp-id',
          userId,
          chapterGenCount: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
        };
      }
      
      throw error;
    }
  }

  /**
   * 章生成が可能かチェック
   */
  static async canGenerateChapter(userId: string): Promise<{
    canGenerate: boolean;
    remaining: number;
    isUnlimited: boolean;
  }> {
    // サブスクリプション状態を確認
    const { plan } = await SubscriptionService.checkSubscriptionStatus(userId);
    
    if (plan !== 'free') {
      return {
        canGenerate: true,
        remaining: -1,
        isUnlimited: true,
      };
    }

    // 無料プランの場合は使用回数をチェック
    const usage = await this.getCurrentPeriod(userId);
    const remaining = this.FREE_PLAN_LIMIT - usage.chapterGenCount;

    return {
      canGenerate: remaining > 0,
      remaining: Math.max(0, remaining),
      isUnlimited: false,
    };
  }

  /**
   * 章生成回数を記録
   */
  static async recordChapterGeneration(userId: string): Promise<void> {
    try {
      const { plan } = await SubscriptionService.checkSubscriptionStatus(userId);
      
      // 有料プランの場合は記録しない
      if (plan !== 'free') {
        return;
      }

      const usage = await this.getCurrentPeriod(userId);
      
      // テーブルが存在しない場合は記録をスキップ
      if (usage.id === 'temp-id') {
        console.warn('Skipping AI usage recording - table not found');
        return;
      }
      
      await prisma.aIUsage.update({
        where: { id: usage.id },
        data: {
          chapterGenCount: {
            increment: 1,
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to record AI usage:', error);
      // エラーが発生しても処理を継続
    }
  }

  /**
   * 使用状況を取得
   */
  static async getUsageStats(userId: string) {
    const { plan } = await SubscriptionService.checkSubscriptionStatus(userId);
    
    if (plan !== 'free') {
      return {
        plan,
        isUnlimited: true,
        used: 0,
        limit: -1,
        remaining: -1,
      };
    }

    const usage = await this.getCurrentPeriod(userId);
    const used = usage.chapterGenCount;
    const remaining = Math.max(0, this.FREE_PLAN_LIMIT - used);

    return {
      plan,
      isUnlimited: false,
      used,
      limit: this.FREE_PLAN_LIMIT,
      remaining,
      periodEnd: usage.periodEnd,
    };
  }

  /**
   * 期限切れの使用履歴をクリーンアップ（オプション）
   */
  static async cleanupOldUsage(): Promise<void> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await prisma.aIUsage.deleteMany({
      where: {
        periodEnd: {
          lt: threeMonthsAgo,
        },
      },
    });
  }
}