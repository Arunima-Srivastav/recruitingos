import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  fetchGoogleProfileEmail,
  saveGoogleConnection,
} from "@/lib/google/oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectBase = `${appUrl}/gmail`;

  try {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent(error)}`
      );
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const savedState = cookieStore.get(STATE_COOKIE)?.value;

    cookieStore.delete(STATE_COOKIE);

    if (!code || !state || !savedState || state !== savedState) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Invalid OAuth state")}`
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    const googleEmail = await fetchGoogleProfileEmail(tokens.access_token);

    await saveGoogleConnection({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scopes: tokens.scope,
      googleEmail,
    });

    return NextResponse.redirect(`${redirectBase}?connected=1`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google OAuth callback failed";
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(message)}`
    );
  }
}
