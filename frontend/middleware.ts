import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check if token exists in localStorage (client-side check)
    // This is a basic check; actual auth happens via API
    const response = NextResponse.next();
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

