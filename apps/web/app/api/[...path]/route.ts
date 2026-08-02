import { NextRequest, NextResponse } from 'next/server';

const API_PROXY_TARGET = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_PROXY_TARGET ||
  'https://pantrypilot-1e2w.onrender.com'
).replace(/\/$/, '');

async function proxyToApi(request: NextRequest) {
  const target = new URL(`${API_PROXY_TARGET}${request.nextUrl.pathname}${request.nextUrl.search}`);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const upstreamResponse = await fetch(target, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  // Hop-by-hop headers describe the upstream connection's framing, not this
  // one — forwarding them causes the browser to misparse the response body
  // (e.g. a stale Transfer-Encoding: chunked against Next's own stream).
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');
  responseHeaders.delete('connection');
  responseHeaders.delete('keep-alive');

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return proxyToApi(request);
}

export async function POST(request: NextRequest) {
  return proxyToApi(request);
}

export async function PUT(request: NextRequest) {
  return proxyToApi(request);
}

export async function PATCH(request: NextRequest) {
  return proxyToApi(request);
}

export async function DELETE(request: NextRequest) {
  return proxyToApi(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyToApi(request);
}
