import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-user";
import { getAuthUrl } from "@/lib/google-drive";

export async function GET() {
  await requireAdmin();
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
