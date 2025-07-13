import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { AIUsageService } from '@/lib/services/ai-usage-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await AIUsageService.getUsageStats(session.user.id);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get AI usage stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'check') {
      // チェックのみ
      const result = await AIUsageService.canGenerateChapter(session.user.id);
      return NextResponse.json(result);
    } else if (action === 'record') {
      // 使用を記録
      await AIUsageService.recordChapterGeneration(session.user.id);
      const stats = await AIUsageService.getUsageStats(session.user.id);
      return NextResponse.json({ success: true, stats });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to process AI usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}