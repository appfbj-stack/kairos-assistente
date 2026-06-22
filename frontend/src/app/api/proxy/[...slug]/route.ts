import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";

const BACKEND_URL = process.env.INTERNAL_API_URL || "http://backend:3010/api";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "borgesjaf@gmail.com";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "Borges1972@";

// Timeout generoso para chamadas LLM (OpenRouter pode demorar 30-90s)
const TIMEOUT_MS = 120000;

function getBasicAuth(req: NextRequest) {
    return (
          req.headers.get("authorization") ||
          "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64")
        );
}

function fetchViaHttp(
    url: string,
    options: {
          method?: string;
          headers?: Record<string, string>;
          body?: string;
    }
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
          const u = new URL(url);
          const mod = u.protocol === "https:" ? https : http;
          const req = mod.request(
                  url,
            {
                      method: options.method || "GET",
                      headers: options.headers || {},
                      timeout: TIMEOUT_MS,
            },
                  (res) => {
                            const chunks: Buffer[] = [];
                            res.on("data", (chunk: Buffer) => chunks.push(chunk));
                            res.on("end", () => {
                                        const body = Buffer.concat(chunks).toString("utf-8");
                                        resolve({ status: res.statusCode || 500, body });
                            });
                  }
                );
          req.on("error", reject);
          req.on("timeout", () => {
                  req.destroy();
                  reject(new Error("LLM timeout - tente novamente"));
          });
          if (options.body) req.write(options.body);
          req.end();
    });
}

async function handler(
    req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
    method: string
  ) {
    const { slug } = await params;
    const path = "/" + slug.join("/");
    const qs = req.nextUrl.search;
    const url = `${BACKEND_URL}${path}${qs}`;

  const headers: Record<string, string> = { Authorization: getBasicAuth(req) };
    if (method !== "GET" && method !== "DELETE") {
          headers["Content-Type"] = "application/json";
    }
    const body =
          method !== "GET" && method !== "DELETE" ? await req.text() : undefined;

  try {
        const res = await fetchViaHttp(url, { method, headers, body });
        return new NextResponse(res.body, {
                status: res.status,
                headers: { "content-type": "application/json" },
        });
  } catch (err: any) {
        const isTimeout = err?.message?.includes("timeout");
        return NextResponse.json(
          {
                    error: isTimeout
                      ? "O assistente demorou muito para responder. Tente novamente."
                                : "Falha ao conectar com o backend",
          },
          { status: isTimeout ? 504 : 502 }
              );
  }
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ slug: string[] }> }
  ) {
    return handler(req, ctx, "GET");
}
export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ slug: string[] }> }
  ) {
    return handler(req, ctx, "POST");
}
export async function PUT(
    req: NextRequest,
    ctx: { params: Promise<{ slug: string[] }> }
  ) {
    return handler(req, ctx, "PUT");
}
export async function DELETE(
    req: NextRequest,
    ctx: { params: Promise<{ slug: string[] }> }
  ) {
    return handler(req, ctx, "DELETE");
}
