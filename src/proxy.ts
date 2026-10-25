import { NextResponse, type NextRequest } from "next/server";

/**
 * Comprobación optimista: sin cookie de sesión, /admin redirige al inicio de sesión.
 * La autorización real ocurre en el servidor en cada página, acción y ruta del panel
 * (src/server/auth/current.ts); esto solo evita renderizar el panel sin necesidad.
 */
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-fulgor_admin" : "fulgor_admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
