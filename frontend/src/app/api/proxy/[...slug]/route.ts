import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INTERNAL_API_URL || "http://backend:3010/api";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "borgesjaf@gmail.com";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "Borges1972@";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const qs = req.nextUrl.search;
  const url = `${BACKEND_URL}${path}${qs}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers["Authorization"] =
    req.headers.get("authorization") ||
    "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64");

  try {
    const res = await fetch(url, { headers, cache: "no-cache" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com o backend" }, { status: 502 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const qs = req.nextUrl.search;
  const url = `${BACKEND_URL}${path}${qs}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization") ||
    "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64");
  headers["Authorization"] = auth;

  const body = await req.text();
  if (body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(url, { method: "POST", headers, body, cache: "no-cache" });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com o backend" }, { status: 502 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const qs = req.nextUrl.search;
  const url = `${BACKEND_URL}${path}${qs}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization") ||
    "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64");
  headers["Authorization"] = auth;

  const body = await req.text();
  if (body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(url, { method: "PUT", headers, body, cache: "no-cache" });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com o backend" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const qs = req.nextUrl.search;
  const url = `${BACKEND_URL}${path}${qs}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization") ||
    "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64");
  headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { method: "DELETE", headers, cache: "no-cache" });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com o backend" }, { status: 502 });
  }
}
