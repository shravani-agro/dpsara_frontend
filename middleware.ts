import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip API routes, static files (images, css, js), next internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp)$/) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login')
  ) {
    return NextResponse.next();
  }

  // Rewrite root (/) to index.html API render
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/dynamic/index.html', request.url));
  }

  // Rewrite any .html file to the dynamic render API
  if (pathname.endsWith('.html')) {
    return NextResponse.rewrite(new URL(`/dynamic${pathname}`, request.url));
  }

  return NextResponse.next();
}
