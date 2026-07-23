import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 100% Edge-Compatible: Evitamos o Buffer (Node API) 
  // e utilizamos a Web API padrão de UUIDv4 encapsulada em Base64
  const nonce = btoa(crypto.randomUUID());

  // Constrói a política Strict CSP
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co;
    font-src 'self';
    connect-src 'self' https://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  // O Header x-nonce é repassado internamente. O Next.js capta ele e 
  // automaticamente assina as tags <script> com o nonce gerado
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // O Header CSP final que vai para o navegador do cliente
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

// Matcher inteligente
export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas, EXCETO:
     * - api (rotas REST)
     * - _next/static (arquivos estáticos compilados)
     * - _next/image (arquivos de imagem otimizados)
     * - favicon.ico, sitemap.xml, robots.txt (metadata puro)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
