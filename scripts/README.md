# Scripts

このディレクトリには、開発やデバッグに役立つスクリプトが含まれています。

## check-db-connection.js

データベース接続の問題を診断するためのスクリプトです。

### 使用方法

```bash
# ローカル環境での実行（.envファイルを使用）
node scripts/check-db-connection.js

# 環境変数を直接指定して実行
DATABASE_URL="postgresql://..." node scripts/check-db-connection.js
```

### このスクリプトが確認する内容

1. DATABASE_URL環境変数の存在
2. データベースへの接続
3. 基本的なクエリの実行
4. テーブルの存在確認

### Render.comでの使用

Render.comのシェルで以下のコマンドを実行：

```bash
cd /opt/render/project/src
node scripts/check-db-connection.js
```