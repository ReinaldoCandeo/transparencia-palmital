import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // S1: Proteção da rota /admin
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 100% Edge-Compatible: Evitamos o Buffer (Node API) 
  // e utilizamos a Web API padrão de UUIDv4 encapsulada em Base64
  const nonce = btoa(crypto.randomUUID());

  // Constrói a política Strict CSP com permissões para o VLibras
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'strict-dynamic' https://*.vlibras.gov.br https://vlibras.gov.br https://cdn.jsdelivr.net https://*.posthog.com https://*.i.posthog.com 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://*.vlibras.gov.br https://vlibras.gov.br https://fonts.googleapis.com https://cdn.jsdelivr.net;
    img-src 'self' blob: data: https://*.supabase.co https://*.vlibras.gov.br https://vlibras.gov.br https://*.amazonaws.com https://cdn.jsdelivr.net https://*.posthog.com https://*.i.posthog.com;
    font-src 'self' https://*.vlibras.gov.br https://vlibras.gov.br https://fonts.gstatic.com https://cdn.jsdelivr.net;
    connect-src 'self' https://*.supabase.co https://*.vlibras.gov.br https://vlibras.gov.br https://*.amazonaws.com https://cdn.jsdelivr.net https://*.posthog.com https://*.i.posthog.com;
    worker-src 'self' blob:;
    child-src 'self' blob: https://vlibras.gov.br https://*.vlibras.gov.br;
    frame-src 'self' https://vlibras.gov.br https://*.vlibras.gov.br;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // O Header x-nonce é repassado internamente. O Next.js capta ele e 
  // automaticamente assina as tags <script> com o nonce gerado
  supabaseResponse.headers.set('x-nonce', nonce);
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader);

  return supabaseResponse;
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
