# TRPGシナリオAI

小説執筆エンジンの仕組み（フロー駆動・AIプロバイダー抽象化・一貫性検証）を流用して、TRPGシナリオを生成する機能です。画面は `/trpg` にあります。

## できること

- クトゥルフ神話TRPG 7版 / D&D 5版 / ソード・ワールド2.5 / 汎用 のシナリオ生成
- 概要・導入、真相、NPC（データ・台詞例つき）、場所と手がかり、シーン（読み上げ文・判定・戦闘）、エンディング、GM向けガイドの一括生成
- 構造の自動検証と、手がかり不足の自動補強
- セクション単位の再生成（追加の指示つき）
- Markdown出力（PL向け情報とGM向け情報を分けて出力）/ JSONの書き出し・読み込み
- セッション中の即興対応を相談できる「GM相談」チャット

## 生成フロー

`src/data/flows/trpg-scenario-flow.ts` で定義し、既存の `FlowEngine` で実行します。

```
design-concept → create-npcs → design-locations-clues → structure-scenes
  → design-endings → validate-structure → repair-clues（手がかりが不足する場合のみ）→ finalize
```

最初に「真相」と「PLが到達すべき重要情報（keyRevelations）」を決め、そこから逆算して手がかりとシーンを配置します。各ステップはIDで互いを参照します（`rev-1`, `npc-1`, `loc-1`, `clue-1`, `scene-1`, `end-1`）。

## 構造検証（AIを使わない）

`ScenarioValidator`（`src/lib/services/trpg/scenario-validator.ts`）は次の点を確認します。

| 観点 | 内容 |
| --- | --- |
| 手がかりの数 | 重要情報（critical）ごとに、PLが入手できる手がかりが3つ以上あるか（「3つの手がかりの法則」）。足りなければ `repair-clues` ステップで追加する |
| 参照の整合性 | 手がかり・シーンが参照する重要情報・場所・NPC・シーンのIDが存在するか |
| シーン遷移 | 導入シーンから全シーンに到達できるか、行き止まりがないか、クライマックスがあるか |
| エンディング | 1つ以上あるか（2つ以上を推奨） |
| 時間配分 | セッション時間に対してシーン数が適切か（1シーン30〜45分が目安） |

## ファイル構成

| パス | 役割 |
| --- | --- |
| `src/lib/types/trpg.ts` | 型定義 |
| `src/data/trpg/game-systems.ts` | システムごとの判定の書式・技能・データ形式・報酬の目安 |
| `src/data/flows/trpg-scenario-flow.ts` | 生成フロー |
| `src/lib/services/trpg/scenario-prompts.ts` | 各ステップのプロンプト |
| `src/lib/services/trpg/scenario-flow-executor.ts` | `FlowExecutor` の実装とセクション再生成 |
| `src/lib/services/trpg/scenario-normalizer.ts` | AI出力の整形（ID補完、型の揺れの吸収） |
| `src/lib/services/trpg/scenario-validator.ts` | 構造検証 |
| `src/lib/services/trpg/scenario-exporter.ts` | Markdown出力 |
| `src/lib/services/trpg/scenario-service.ts` | localStorageへの保存 |
| `src/lib/services/trpg/gm-assistant-service.ts` | GM相談チャット |
| `src/app/trpg/` / `src/components/trpg/` | 画面 |

## システムを追加するには

`src/lib/types/trpg.ts` の `TRPGSystemId` にIDを追加し、`src/data/trpg/game-systems.ts` の `GAME_SYSTEMS` にプリセット（判定の書式、よく使う技能、NPC・敵のデータ形式、報酬の目安）を追加します。プロンプトはプリセットから自動で組み立てられます。
