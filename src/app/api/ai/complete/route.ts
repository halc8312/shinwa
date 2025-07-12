import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { AICompletionOptions, AIProvider } from '@/lib/ai/types';
import { AIUsageService } from '@/lib/services/ai-usage-service';
import { RetryAIProvider } from '@/lib/ai/retry-provider';
import { CachedAIProvider } from '@/lib/ai/cache-provider';

// Server-side AI provider instances
let openAIProvider: OpenAIProvider | null = null;
let anthropicProvider: AnthropicProvider | null = null;

// Initialize providers with server-side API keys, retry logic, and caching
function getProvider(providerName: string): AIProvider {
  switch (providerName) {
    case 'openai':
      if (!openAIProvider) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key not configured on server');
        }
        const baseProvider = new OpenAIProvider({ apiKey });
        const retryProvider = new RetryAIProvider(baseProvider, {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000
        });
        openAIProvider = new CachedAIProvider(retryProvider, {
          ttl: 3600000, // 1 hour cache
          maxSize: 100,
          cacheableModels: ['gpt-4.1-mini', 'gpt-4.1-nano'], // Cache responses from faster models
          minPromptLength: 100
        }) as any; // Cast to keep type compatibility
      }
      return openAIProvider;
    
    case 'anthropic':
      if (!anthropicProvider) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('Anthropic API key not configured on server');
        }
        const baseProvider = new AnthropicProvider({ apiKey });
        const retryProvider = new RetryAIProvider(baseProvider, {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000
        });
        anthropicProvider = new CachedAIProvider(retryProvider, {
          ttl: 3600000, // 1 hour cache
          maxSize: 100,
          cacheableModels: ['claude-3-haiku-20240307'], // Cache responses from faster models
          minPromptLength: 100
        }) as any; // Cast to keep type compatibility
      }
      return anthropicProvider;
    
    default:
      throw new Error(`Unknown provider: ${providerName}`);
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

    const body = await request.json();
    const { provider: providerName, options, stream = false } = body;

    if (!providerName || !options) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check AI usage limits
    const canGenerate = await AIUsageService.canGenerateChapter(session.user.id);
    if (!canGenerate.canGenerate) {
      return NextResponse.json(
        { error: 'AI usage limit exceeded' },
        { status: 403 }
      );
    }

    const provider = getProvider(providerName);
    const completionOptions: AICompletionOptions = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      stopSequences: options.stopSequences
    };

    if (stream) {
      // For streaming responses, we need to handle this differently
      // This is a simplified version - in production you'd want to use Server-Sent Events
      const response = await provider.complete(completionOptions);
      return NextResponse.json(response);
    } else {
      const response = await provider.complete(completionOptions);
      
      // Record usage
      await AIUsageService.recordChapterGeneration(session.user.id);
      
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

// Validate API key endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get('provider');

    if (!providerName) {
      return NextResponse.json(
        { error: 'Provider name required' },
        { status: 400 }
      );
    }

    try {
      const provider = getProvider(providerName);
      const isValid = await provider.validateApiKey();
      return NextResponse.json({ valid: isValid });
    } catch (error: any) {
      return NextResponse.json({ valid: false, error: error.message });
    }
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}