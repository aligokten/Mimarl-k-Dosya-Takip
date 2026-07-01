import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  getAccountEmail,
  ensureRootFolder,
} from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/ayarlar?drive_error=1", request.nextUrl.origin)
    );
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/ayarlar?drive_error=missing_refresh_token", request.nextUrl.origin)
    );
  }

  const accountEmail = await getAccountEmail(tokens.access_token);

  await prisma.googleDriveConnection.deleteMany();
  await prisma.googleDriveConnection.create({
    data: {
      accountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  await ensureRootFolder();

  return NextResponse.redirect(
    new URL("/ayarlar?drive_connected=1", request.nextUrl.origin)
  );
}
