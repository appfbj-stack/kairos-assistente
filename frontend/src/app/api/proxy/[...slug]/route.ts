import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INTERNAL_API_URL || "http://backend:3010/api";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "borgesjaf@gmail.com";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "Borges1972@";

// Timeout para chamadas LLM (OpenRouter pode demorar 30-90s)
export const maxDuration = 120;

function getBasicAuth(req: NextRequest): string {
      return (
              req.headers.get("authorization") ||
              "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64")
            );
}

async function handler(
      req: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> },
      method: string
    ): Promise<NextResponse> {
      const { slug } = await params;
      const path = "/" + slug.join("/");
      const qs = req.nextUrl.search;
      const url = `${BACKEND_URL}${path}${qs}`;

  const headers: HeadersInit = {
          Authorization: getBasicAuth(req),
  };

  let bodyData: string | undefined;
      if (method !== "GET" && method !== "DELETE") {
              headers["Content-Type"] = "application/json";
              bodyData = await req.text();
      }

  try {
          const backendRes = await fetch(url, {
                    method,
                    headers,
                    body: bodyData,
                    // @ts-ignore - Node.js fetch signal for timeout
                    signal: AbortSignal.timeout(110000),
          });

        const responseText = await backendRes.text();

        return new NextResponse(responseText, {
                  status: backendRes.status,
                  headers: { "content-type": "application/json; charset=utf-8" },
        });
  } catch (err: any) {
          const isTimeout = err?.name === "TimeoutError" || err?.message?.includes("timeout");
          return NextResponse.json(
              {
                          error: isTimeout
                            ? "O assistente demorou muito para responder. Tente novamente."
                                        : "Falha ao conectar com o backend",
                          detail: err?.message,
              },
              { status: isTimeout ? 504 : 502 }
                  );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
      return handler(req, ctx, "GET");
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
      return handler(req, ctx, "POST");
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
      return handler(req, ctx, "PUT");
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
      return handler(req, ctx, "DELETE");
}
