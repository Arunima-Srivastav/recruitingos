import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";
import { getGoogleConfigError } from "@/lib/google/config";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  const configError = getGoogleConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(
      new URL("/login?next=/gmail", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
