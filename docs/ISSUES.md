# ISSUES: 技術的な改善提案

このドキュメントは、新規小説プロジェクト作成機能における技術的な課題と、その解決策を詳細に記載したものです。

## 1. アーキテクチャの課題と改善提案

### 課題: モノリシックなFlowExecutor
**現状の問題点:**
- `NovelFlowExecutor`が1545行の巨大なクラスで、多数の責務を持っている
- AIプロンプト構築、キャラクター追跡、位置検証、伏線管理など全てを一つのクラスで処理
- テストが困難で、メンテナンスコストが高い

**改善提案:**
```typescript
// 責務ごとにサービスを分割
interface FlowExecutorDependencies {
  promptBuilder: PromptBuilderService;
  characterTracker: CharacterTrackingService;
  locationValidator: LocationValidationService;
  foreshadowingManager: ForeshadowingService;
  contextManager: FlowContextManager;
}

// 各サービスは単一責任原則に従う
class PromptBuilderService {
  buildAnalysisPrompt(context: FlowContext): string { /* ... */ }
  buildWritingPrompt(context: FlowContext): string { /* ... */ }
}

class CharacterTrackingService {
  trackCharacterAppearance(chapter: ChapterContent): CharacterAppearance[] { /* ... */ }
  validateCharacterConsistency(characters: Character[]): ValidationResult { /* ... */ }
}
```

### 課題: LocalStorageへの過度な依存
**現状の問題点:**
- プロジェクトデータがLocalStorageに保存され、デバイス間同期ができない
- データ容量制限（5-10MB）がある
- ブラウザクリアでデータが失われるリスク

**改善提案:**
```typescript
// 段階的なデータベース移行戦略
interface StorageAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

class HybridStorageAdapter implements StorageAdapter {
  constructor(
    private localStorage: LocalStorageAdapter,
    private dbStorage: DatabaseStorageAdapter,
    private syncService: DataSyncService
  ) {}

  async save(key: string, data: any): Promise<void> {
    // ローカルに即座に保存
    await this.localStorage.save(key, data);
    
    // バックグラウンドでDBに同期
    this.syncService.queueSync(key, data);
  }
}
```

## 2. AI統合の課題と改善提案

### 課題: リトライメカニズムの欠如
**現状の問題点:**
- ネットワークエラーやレート制限でAI呼び出しが失敗すると、即座にエラーになる
- ユーザーは最初からやり直す必要がある

**改善提案:**
```typescript
class AIProviderWithRetry {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  async completeWithRetry(params: CompletionParams): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.provider.complete(params);
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error)) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new AIRetryExhaustedError(lastError, this.maxRetries);
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return exponentialDelay + jitter;
  }
}
```

### 課題: キャッシング機能の不在
**現状の問題点:**
- 同一のプロンプトで何度もAIを呼び出している
- 特に検証や分析系の処理で無駄が多い

**改善提案:**
```typescript
interface CacheEntry {
  key: string;
  value: string;
  timestamp: number;
  ttl: number;
}

class AIResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 3600000; // 1時間

  async getOrGenerate(
    key: string,
    generator: () => Promise<string>,
    ttl?: number
  ): Promise<string> {
    const cached = this.get(key);
    if (cached) return cached;

    const value = await generator();
    this.set(key, value, ttl);
    return value;
  }

  private generateKey(prompt: string, model: string, temperature: number): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${prompt}|${model}|${temperature}`);
    return hash.digest('hex');
  }
}
```

## 3. UXの技術的課題と改善提案

### 課題: フォーカストラップの未実装
**現状の問題点:**
- モーダル外にタブ移動できてしまう
- キーボードナビゲーションが不完全

**改善提案:**
```typescript
// React Hooksを使用したフォーカストラップ
function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    element.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => element.removeEventListener('keydown', handleTab);
  }, [ref]);
}
```

### 課題: プログレス状態の管理
**現状の問題点:**
- 生成プロセスの進捗が正確に反映されない
- キャンセル機能がない

**改善提案:**
```typescript
interface GenerationProgress {
  step: string;
  progress: number;
  estimatedTimeRemaining?: number;
  canCancel: boolean;
}

class GenerationProgressTracker {
  private startTime: number;
  private stepDurations: Map<string, number> = new Map();
  private abortController?: AbortController;

  startGeneration(steps: string[]): AbortController {
    this.startTime = Date.now();
    this.abortController = new AbortController();
    return this.abortController;
  }

  updateProgress(currentStep: string, stepIndex: number, totalSteps: number): GenerationProgress {
    const progress = (stepIndex / totalSteps) * 100;
    const estimatedTimeRemaining = this.estimateTimeRemaining(currentStep, stepIndex, totalSteps);

    return {
      step: currentStep,
      progress,
      estimatedTimeRemaining,
      canCancel: !this.abortController?.signal.aborted
    };
  }

  private estimateTimeRemaining(currentStep: string, stepIndex: number, totalSteps: number): number {
    const elapsedTime = Date.now() - this.startTime;
    const averageStepTime = elapsedTime / (stepIndex + 1);
    const remainingSteps = totalSteps - stepIndex - 1;
    return averageStepTime * remainingSteps;
  }
}
```

## 4. パフォーマンスの課題と改善提案

### 課題: 並列実行の未活用
**現状の問題点:**
- 独立したステップが順次実行されている
- 生成時間が不必要に長い

**改善提案:**
```typescript
class ParallelFlowExecutor {
  async executeFlow(flow: Flow, context: FlowContext): Promise<FlowResult> {
    const executionPlan = this.buildExecutionPlan(flow);
    
    // 依存関係のないステップを並列実行
    for (const parallelGroup of executionPlan) {
      const promises = parallelGroup.map(step => 
        this.executeStep(step, context)
      );
      
      const results = await Promise.all(promises);
      
      // 結果をコンテキストにマージ
      results.forEach(result => {
        context = this.mergeContext(context, result);
      });
    }
    
    return context;
  }

  private buildExecutionPlan(flow: Flow): Step[][] {
    // 依存関係を解析して並列実行可能なグループを作成
    const graph = this.buildDependencyGraph(flow);
    return this.topologicalSort(graph);
  }
}
```

### 課題: メモリ使用量の最適化不足
**現状の問題点:**
- フローコンテキストが肥大化する
- 大きなプロジェクトでメモリ不足になる可能性

**改善提案:**
```typescript
class OptimizedFlowContext {
  private essentialData: Map<string, any> = new Map();
  private largeDataRefs: Map<string, WeakRef<any>> = new Map();

  set(key: string, value: any, isLarge: boolean = false): void {
    if (isLarge) {
      // 大きなデータは弱参照で保持
      this.largeDataRefs.set(key, new WeakRef(value));
    } else {
      this.essentialData.set(key, value);
    }
  }

  get(key: string): any {
    if (this.essentialData.has(key)) {
      return this.essentialData.get(key);
    }

    const ref = this.largeDataRefs.get(key);
    if (ref) {
      const value = ref.deref();
      if (value === undefined) {
        // GCされた場合は再生成が必要
        throw new DataEvictedError(key);
      }
      return value;
    }
  }
}
```

## 5. セキュリティとデータ整合性の課題

### 課題: APIキーの管理
**現状の問題点:**
- APIキーがLocalStorageに平文で保存されている
- XSS攻撃のリスクがある

**改善提案:**
```typescript
// サーバーサイドでのAPIキー管理
class SecureAPIKeyManager {
  async encryptAndStore(provider: string, apiKey: string): Promise<void> {
    // サーバーに暗号化して送信
    const response = await fetch('/api/keys/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        encryptedKey: await this.encrypt(apiKey)
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to store API key');
    }
  }

  async getKey(provider: string): Promise<string> {
    // サーバーから取得（トークンは自動的に含まれる）
    const response = await fetch(`/api/keys/${provider}`);
    
    if (!response.ok) {
      throw new Error('Failed to retrieve API key');
    }
    
    const { encryptedKey } = await response.json();
    return this.decrypt(encryptedKey);
  }
}
```

## 実装優先順位

1. **即座に実装すべき項目**
   - フォーカストラップとアクセシビリティ改善
   - AIリトライメカニズム
   - 基本的なキャッシング機能

2. **中期的に実装すべき項目**
   - FlowExecutorのリファクタリング
   - 並列実行の実装
   - プログレストラッキングの改善

3. **長期的に実装すべき項目**
   - データベースへの完全移行
   - 高度なメモリ最適化
   - セキュリティ強化

これらの改善により、システムの信頼性、パフォーマンス、ユーザビリティが大幅に向上することが期待されます。