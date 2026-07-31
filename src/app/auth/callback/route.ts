import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

function getSafeNextPath(
  requestedPath: string | null,
  fallbackPath: string,
): string {
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//")
  ) {
    return fallbackPath;
  }

  return requestedPath;
}

export async function GET(
  request: NextRequest,
) {
  const code =
    request.nextUrl.searchParams.get(
      "code",
    );

  const flow =
    request.nextUrl.searchParams.get(
      "flow",
    );

  const isSignupConfirmation =
    flow === "signup";

  const defaultDestination =
    isSignupConfirmation
      ? "/onboarding"
      : "/update-password";

  const nextDestination =
    getSafeNextPath(
      request.nextUrl.searchParams.get(
        "next",
      ),
      defaultDestination,
    );

  if (!code) {
    const errorDestination =
      isSignupConfirmation
        ? `/login?error=${encodeURIComponent(
            "The confirmation link is invalid or has expired.",
          )}`
        : "/forgot-password";

    return NextResponse.redirect(
      new URL(
        errorDestination,
        request.url,
      ),
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth
      .exchangeCodeForSession(code);

  if (error) {
    console.error(
      "Authentication callback failed:",
      error,
    );

    const errorDestination =
      isSignupConfirmation
        ? `/login?error=${encodeURIComponent(
            "The confirmation link is invalid or has expired.",
          )}`
        : "/forgot-password";

    return NextResponse.redirect(
      new URL(
        errorDestination,
        request.url,
      ),
    );
  }

  /*
   * Keep the confirmed user signed in.
   * They need the active session to save
   * their profile during onboarding.
   */
  return NextResponse.redirect(
    new URL(
      nextDestination,
      request.url,
    ),
  );
}