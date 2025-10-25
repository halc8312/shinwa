import { NextRequest, NextResponse } from 'next/server';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { AICompletionOptions, AIProvider } from '@/lib/ai/types';
import { RetryAIProvider } from '@/lib/ai/retry-provider';
import { CachedAIProvider } from '@/lib/ai/cache-provider';

// Server-side AI provider instances
let openAIProvider: OpenAIProvider | null = null;

// Initialize provider with server-side API keys, retry logic, and caching
function getProvider(): AIProvider {
  // Manus AIはOpenAI互換のみをサポートするため、プロバイダー名は固定
  const providerName = 'openai';

  if (!openAIProvider) {
    // Manus AIは環境変数から自動的に設定されるため、APIキーチェックは不要
    const baseProvider = new OpenAIProvider();
    
    // リトライとキャッシュのロジックは残し、堅牢性を維持
    const retryProvider = new RetryAIProvider(baseProvider, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    });
    
    // キャッシュは、組み込みモデルに合わせてモデル名を調整
    openAIProvider = new CachedAIProvider(retryProvider, {
      ttl: 3600000, // 1 hour cache
      maxSize: 100,
      cacheableModels: ['gpt-4.1-mini', 'gpt-4.1-nano', 'gemini-2.5-flash'],
      minPromptLength: 100
    }) as any; // Cast to keep type compatibility
  }
  return openAIProvider as AIProvider;
}

export async function POST(request: NextRequest) {
  try {
    // 認証と利用制限チェックは削除
    
    const body = await request.json();
    // providerNameは常に'openai'として扱うため、bodyから取得する必要はない
    const { options, stream = false } = body;

    if (!options) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const provider = getProvider();
    const completionOptions: AICompletionOptions = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      stopSequences: options.stopSequences
    };

    if (stream) {
      // ストリーミング処理は今回は省略
      const response = await provider.complete(completionOptions);
      return NextResponse.json(response);
    } else {
      const response = await provider.complete(completionOptions);
      
      // 利用状況の記録は削除
      
      return NextResponse.json(response);
    }
  } catch (error: any) {
    console.error('AI completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
}

// Validate API key endpoint - 組み込みAIでは常に有効
export async function GET(request: NextRequest) {
  try {
    // 認証チェックは削除
    
    // 常に有効なAPIキーとして応答
    return NextResponse.json({ valid: true });
    
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
