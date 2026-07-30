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
      ? `/login?message=${encodeURIComponent(
          "Email confirmed successfully. You can now log in.",
        )}`
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
   * Email confirmation creates a temporary
   * authenticated session. Sign out here so
   * the user returns to the login page and
   * logs in normally after confirming.
   *
   * Password recovery must remain signed in
   * so Supabase allows the password update.
   */
  if (isSignupConfirmation) {
    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      console.error(
        "Confirmation sign-out failed:",
        signOutError,
      );
    }
  }

  return NextResponse.redirect(
    new URL(
      nextDestination,
      request.url,
    ),
  );
}
