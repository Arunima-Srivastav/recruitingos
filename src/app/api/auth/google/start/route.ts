import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";
import { getGoogleConfigError } from "@/lib/google/config";

const STATE_COOKIE = "google_oauth_state";
const RETURN_TO_COOKIE = "google_oauth_return_to";

export async function GET(request: Request) {
  const configError = getGoogleConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") ?? "/gmail";
  const includeCalendar = url.searchParams.get("calendar") === "1";

  try {
    await requireUser();
  } catch {
    const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    loginUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };

  cookieStore.set(STATE_COOKIE, state, cookieOptions);
  cookieStore.set(RETURN_TO_COOKIE, returnTo, cookieOptions);

  return NextResponse.redirect(
    buildGoogleAuthUrl(state, { includeCalendar })
  );
}
