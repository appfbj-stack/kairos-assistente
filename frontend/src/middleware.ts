import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Kairos Barber: link público de agendamento (clientes finais) e painel da
  // equipe (login próprio via JWT do Core) não usam o Basic Auth do Admin.
  if (pathname.startsWith("/agendar") || pathname.startsWith("/barber")) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return NextResponse.next();
  }

  const b64 = Buffer.from(`${user}:${password}`).toString("base64");
  const expected = "Basic " + b64;
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

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Kairos Admin"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
