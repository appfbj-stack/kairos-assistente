import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não usam Basic Auth do Admin:
  // - /agendar e /barber: agendamento público (clientes finais)
  // - /assistente: widget público de atendimento IA
  if (pathname.startsWith("/agendar") || pathname.startsWith("/barber") || pathname.startsWith("/assistente") || pathname.startsWith("/api/proxy/atendimento/public")) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return NextResponse.next();
  }

  const b64 = Buffer.from(`${user}:${password}`).toString("base64");
  const expected = "Basic " + b64;

  // Check Authorization header (initial page load)
  if (request.headers.get("authorization") === expected) {
    const response = NextResponse.next();
    response.cookies.set("kairos_auth", b64, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return response;
  }

  // Check kairos_auth cookie (JS fetch calls)
  const cookieAuth = request.cookies.get("kairos_auth")?.value;
  if (cookieAuth && `Basic ${cookieAuth}` === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Kairos Admin"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
