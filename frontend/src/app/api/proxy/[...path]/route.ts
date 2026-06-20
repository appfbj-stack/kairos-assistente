import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend:3010/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND_URL}${apiPath}${qs}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  else {
    const b64 = request.cookies.get("kairos_auth")?.value;
    if (b64) headers["Authorization"] = "Basic " + b64;
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o backend" }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND_URL}${apiPath}${qs}`;
  const body = await request.text();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  else {
    const b64 = request.cookies.get("kairos_auth")?.value;
    if (b64) headers["Authorization"] = "Basic " + b64;
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body, cache: "no-store" });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o backend" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND_URL}${apiPath}${qs}`;
  const body = await request.text();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  else {
    const b64 = request.cookies.get("kairos_auth")?.value;
    if (b64) headers["Authorization"] = "Basic " + b64;
  }

  try {
    const res = await fetch(url, { method: "PUT", headers, body, cache: "no-store" });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o backend" }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND_URL}${apiPath}${qs}`;
  const body = await request.text();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  else {
    const b64 = request.cookies.get("kairos_auth")?.value;
    if (b64) headers["Authorization"] = "Basic " + b64;
  }

  try {
    const res = await fetch(url, { method: "PATCH", headers, body, cache: "no-store" });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o backend" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const qs = request.nextUrl.search;
  const url = `${BACKEND_URL}${apiPath}${qs}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  else {
    const b64 = request.cookies.get("kairos_auth")?.value;
    if (b64) headers["Authorization"] = "Basic " + b64;
  }

  try {
    const res = await fetch(url, { method: "DELETE", headers, cache: "no-store" });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o backend" }, { status: 502 });
  }
}
