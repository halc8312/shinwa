# TODO: 新規小説プロジェクト作成フローの改善点

このドキュメントは、新規小説プロジェクト作成フローのユーザビリティを向上させるための改善点をまとめたものです。

## 優先度: 高 🔴

### 1. アクセシビリティの改善
- [ ] モーダルにARIA属性を追加（`role="dialog"`, `aria-modal="true"`, `aria-labelledby`）
- [ ] フォーカストラップの実装（モーダル内でのタブ移動を制限）
- [ ] スクリーンリーダー用のラベルを全てのインタラクティブ要素に追加
- [ ] 動的コンテンツ更新用の`aria-live`リージョンを実装

### 2. エラーハンドリングの強化
- [ ] エラー回復のガイダンスを追加（特にAI生成失敗時）
- [ ] エラーメッセージの永続化（ステップ間でエラーが消えない）
- [ ] 回復可能/不可能なエラーの区別を明確化
- [ ] APIキー設定エラー時のインラインソリューション提供

### 3. プログレス表示の改善
- [ ] AI生成の推定残り時間表示を追加
- [ ] 完了したステップの視覚的な表示
- [ ] AI生成のキャンセル機能を実装
- [ ] プログレスバーのスムーズなアニメーション

### 4. モバイル対応の強化
- [ ] タッチターゲットサイズの最適化（最小44x44px）
- [ ] モバイルでの小説タイプ選択UIの改善
- [ ] テキストエリアのサイズをモバイルに最適化
- [ ] スクロール体験の改善

## 優先度: 中 🟡

### 5. マルチステップフローの改善
- [ ] ステップインジケーター/ブレッドクラムの追加
- [ ] 前のステップに戻る機能の実装
- [ ] フロー状態の自動保存機能
- [ ] 確認画面表示の遅延を削除（現在の1秒待機）

### 6. フォームバリデーションの改善
- [ ] インラインバリデーションの実装
- [ ] 文字数制限の表示
- [ ] 必須フィールドの一貫した表示
- [ ] カスタム章数の入力値検証（0や負の数を防ぐ）

### 7. 再生成UXの改善
- [ ] 再生成オプションの分かりやすい説明
- [ ] 保持される内容と再生成される内容の明確化
- [ ] 条件付きUIによるレイアウトシフトの防止
- [ ] 温度パラメータの説明を追加

### 8. AIプロバイダーの機能拡張
- [ ] リトライメカニズムの実装（エクスポネンシャルバックオフ）
- [ ] AIレスポンスのキャッシング機能
- [ ] プロバイダーフォールバック機能
- [ ] リクエストキューイングの実装

## 優先度: 低 💚

### 9. ユーザーガイダンスの強化
- [ ] AIモデルの違いを説明するツールチップ
- [ ] プロジェクト説明フィールドのサンプル提供
- [ ] AI生成内容のプレビュー機能
- [ ] 小説タイプ選択のヘルプテキスト

### 10. パフォーマンス最適化
- [ ] AI設定コンポーネントの遅延読み込み
- [ ] フォーム入力のデバウンス処理
- [ ] 長いチャプターリストの仮想スクロール
- [ ] AI生成結果のキャッシング

### 11. ビジュアルフィードバックの改善
- [ ] 成功状態の文脈に応じた表示
- [ ] ホバー状態の追加
- [ ] スケルトンスクリーンの実装
- [ ] ローディング状態の具体的なメッセージ

### 12. ナビゲーションの強化
- [ ] キーボードショートカットの実装（Escで閉じる、Enterで送信）
- [ ] 適切なフォーカス管理
- [ ] プロジェクト作成後の明確な次のステップ表示
- [ ] バックグラウンド生成と通知機能

## 実装における注意点

1. **段階的な実装**: 優先度の高い項目から順に実装し、ユーザー体験を段階的に改善
2. **テストの重要性**: 特にアクセシビリティ機能は、実際のスクリーンリーダーでテスト
3. **パフォーマンス監視**: 新機能追加時は、パフォーマンスへの影響を測定
4. **ユーザーフィードバック**: 実装後は、実際のユーザーからのフィードバックを収集

## 技術的な実装ヒント

- **フォーカストラップ**: `focus-trap-react`ライブラリの使用を検討
- **アクセシビリティ**: `react-aria`や`@radix-ui`などのアクセシブルなコンポーネントライブラリの活用
- **状態管理**: フロー状態の永続化には`zustand`の`persist`ミドルウェアが有効
- **エラーバウンダリ**: React Error Boundaryを使用して、グレースフルなエラーハンドリングを実装