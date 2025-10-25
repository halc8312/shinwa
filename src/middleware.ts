import { NextResponse } from 'next/server'

// 認証をスキップするため、ミドルウェアを無効化
export function middleware(req: Request) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // 認証スキップのため、matcherを空にするか、コメントアウト
    // '/projects/:path*',
    // '/account/:path*',
  ]
}