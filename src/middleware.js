import { NextResponse } from "next/server";

export const config = {
  matcher: "/integrations/:path*",
};

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-createxyz-project-id", "e21d2466-7e11-40d2-9700-6ad43d1db139");
  requestHeaders.set("x-createxyz-project-group-id", "c070154e-ca4c-4aed-a84b-0d1781e8dd4e");


  request.nextUrl.href = `https://www.create.xyz/${request.nextUrl.pathname}`;

  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}