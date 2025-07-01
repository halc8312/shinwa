#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 データベースセットアップを開始します...\n');

try {
  // 1. 環境変数の確認
  console.log('1️⃣ 環境変数を確認中...');
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL が設定されていません。');
    console.log('   .envファイルを作成して、DATABASE_URLを設定してください。');
    process.exit(1);
  }
  console.log('✅ DATABASE_URL が設定されています。\n');

  // 2. Prismaクライアントの生成
  console.log('2️⃣ Prismaクライアントを生成中...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prismaクライアントの生成が完了しました。\n');

  // 3. データベースのスキーマを反映
  console.log('3️⃣ データベースにスキーマを反映中...');
  console.log('   これには少し時間がかかる場合があります...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ データベースのセットアップが完了しました。\n');

  // 4. 成功メッセージ
  console.log('🎉 セットアップが正常に完了しました！');
  console.log('   アプリケーションを起動できます: npm run dev');
  
} catch (error) {
  console.error('\n❌ エラーが発生しました:');
  console.error(error.message);
  
  if (error.message.includes('P1001')) {
    console.log('\n💡 ヒント: データベースに接続できません。');
    console.log('   - DATABASE_URLが正しいか確認してください');
    console.log('   - データベースサーバーが起動しているか確認してください');
    console.log('   - ネットワーク接続を確認してください');
  } else if (error.message.includes('P1012')) {
    console.log('\n💡 ヒント: 環境変数が見つかりません。');
    console.log('   - .envファイルが存在するか確認してください');
    console.log('   - DATABASE_URLが正しく設定されているか確認してください');
  }
  
  process.exit(1);
}