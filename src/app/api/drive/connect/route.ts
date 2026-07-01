import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-user";
import { getAuthUrl } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const url = getAuthUrl(request.nextUrl.origin);
  return NextResponse.redirect(url);
}
