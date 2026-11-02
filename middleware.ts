import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block/redirect legacy /admin and /login paths to protect admin portal secrecy
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/login' ||
    pathname.startsWith('/login/')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Skip API routes, static files (images, css, js, xml, txt), next internals, and ouradminportal
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp|xml|txt)$/) ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/ouradminportal')
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
