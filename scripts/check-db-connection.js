#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * This script tests the database connection and helps diagnose connection issues.
 * Run with: node scripts/check-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');

async function checkDatabaseConnection() {
  console.log('🔍 データベース接続チェックを開始します...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ エラー: DATABASE_URL 環境変数が設定されていません');
    console.log('\n💡 解決方法:');
    console.log('1. .env ファイルを作成し、DATABASE_URL を設定してください');
    console.log('2. または、環境変数として設定してください:');
    console.log('   DATABASE_URL="postgresql://..." node scripts/check-db-connection.js\n');
    process.exit(1);
  }

  // Mask sensitive parts of the connection string for logging
  const maskedUrl = process.env.DATABASE_URL.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:****@'
  );
  console.log(`📌 DATABASE_URL: ${maskedUrl}\n`);

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('🔗 データベースへの接続を試みています...');
    
    // Test the connection
    await prisma.$connect();
    console.log('✅ データベースへの接続に成功しました！\n');

    // Try to execute a simple query
    console.log('📊 データベース情報を取得しています...');
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('✅ クエリの実行に成功しました！');
    console.log(`📋 データベース: ${result[0].current_database}`);
    console.log(`📋 バージョン: ${result[0].version}\n`);

    // Check if tables exist
    console.log('🔍 テーブルの存在を確認しています...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      console.log('⚠️  警告: テーブルが見つかりません');
      console.log('\n💡 解決方法:');
      console.log('1. npx prisma db push を実行してスキーマを同期してください');
      console.log('2. または、npx prisma migrate deploy を実行してください\n');
    } else {
      console.log(`✅ ${tables.length} 個のテーブルが見つかりました:`);
      tables.forEach(t => console.log(`   - ${t.table_name}`));
      console.log();
    }

    console.log('🎉 すべてのチェックが完了しました！データベース接続は正常です。');

  } catch (error) {
    console.error('\n❌ データベース接続エラー:', error.message);
    
    // Provide specific guidance based on error type
    if (error.message.includes('P1001')) {
      console.log('\n💡 解決方法:');
      console.log('1. データベースサーバーが起動していることを確認してください');
      console.log('2. ホスト名とポート番号が正しいことを確認してください');
      console.log('3. ファイアウォールやネットワーク設定を確認してください');
    } else if (error.message.includes('P1002')) {
      console.log('\n💡 解決方法:');
      console.log('1. データベースサーバーに到達できることを確認してください');
      console.log('2. 接続タイムアウトの設定を確認してください');
    } else if (error.message.includes('P1003')) {
      console.log('\n💡 解決方法:');
      console.log('1. データベース名が正しいことを確認してください');
      console.log('2. データベースが存在することを確認してください');
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.log('\n💡 解決方法:');
      console.log('1. ユーザー名とパスワードが正しいことを確認してください');
      console.log('2. パスワードに特殊文字が含まれる場合は、URLエンコードしてください');
      console.log('   例: @ → %40, : → %3A');
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.log('\n💡 解決方法:');
      console.log('1. DATABASE_URLに ?ssl=true を追加してください');
      console.log('2. または ?sslmode=require を試してください');
    }
    
    console.log('\n📚 詳細なエラー情報:');
    console.log(error);
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDatabaseConnection().catch(console.error);