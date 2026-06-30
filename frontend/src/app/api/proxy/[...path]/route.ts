import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://backend:3010';
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || '';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || '';

type Params = Promise<{ path: string[] }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxyRequest(req, path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxyRequest(req, path, 'POST');
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxyRequest(req, path, 'PUT');
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  return proxyRequest(req, path, 'DELETE');
}

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const search = req.nextUrl.search || '';
  const url = BACKEND_URL + '/api/' + path + search;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
    const b64 = Buffer.from(BASIC_AUTH_USER + ':' + BASIC_AUTH_PASSWORD).toString('base64');
    headers['Authorization'] = 'Basic ' + b64;
  }
  let body: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try { body = await req.text(); } catch { /* empty */ }
  }
  const response = await fetch(url, { method, headers, body });
  const data = await response.text();
  const ct = response.headers.get('Content-Type') || 'application/json';
  return new NextResponse(data, { status: response.status, headers: { 'Content-Type': ct } });
}
