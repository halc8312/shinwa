import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      database: false,
      openai: false,
      anthropic: false,
      auth: false,
    },
    errors: [] as string[],
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = true;
  } catch (error: any) {
    checks.status = 'error';
    checks.errors.push(`Database connection failed: ${error.message}`);
  }

  // OpenAI API key check
  if (process.env.OPENAI_API_KEY) {
    checks.checks.openai = true;
  } else {
    checks.errors.push('OpenAI API key not configured');
  }

  // Anthropic API key check
  if (process.env.ANTHROPIC_API_KEY) {
    checks.checks.anthropic = true;
  } else {
    checks.errors.push('Anthropic API key not configured');
  }

  // Auth configuration check
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET) {
    checks.checks.auth = true;
  } else {
    checks.status = 'error';
    checks.errors.push('Authentication not properly configured');
  }

  // Additional environment variables check
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length > 0) {
    checks.status = 'error';
    checks.errors.push(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }

  // Set appropriate status code
  const statusCode = checks.status === 'ok' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}