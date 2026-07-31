import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

function copyCookies(
  source: NextResponse,
  target: NextResponse,
) {
  source.cookies
    .getAll()
    .forEach((cookie) => {
      target.cookies.set(cookie);
    });
}

function createRedirectResponse(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destination: string,
) {
  const redirectUrl =
    request.nextUrl.clone();

  redirectUrl.pathname = destination;
  redirectUrl.search = "";

  const redirectResponse =
    NextResponse.redirect(redirectUrl);

  copyCookies(
    supabaseResponse,
    redirectResponse,
  );

  return redirectResponse;
}

export async function updateSession(
  request: NextRequest,
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options,
                );
              },
            );
          },
        },
      },
    );

  const {
    data,
    error,
  } = await supabase.auth.getClaims();

  const userId =
    typeof data?.claims?.sub === "string"
      ? data.claims.sub
      : null;

  const isLoggedIn =
    !error && Boolean(userId);

  const pathname =
    request.nextUrl.pathname;

  const isLoginPage =
    pathname === "/login";

  const isForgotPasswordPage =
    pathname === "/forgot-password";

  const isUpdatePasswordPage =
    pathname === "/update-password";

  const isOnboardingPage =
    pathname === "/onboarding";

  const isAuthRoute =
    pathname.startsWith("/auth/");

  const isApiRoute =
    pathname.startsWith("/api/");

  const isPublicRoute =
    isLoginPage ||
    isForgotPasswordPage ||
    isAuthRoute;

  /*
   * Logged-out users can access only the
   * login, forgot-password and auth routes.
   */
  if (
    !isLoggedIn &&
    !isPublicRoute
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.searchParams.set(
      "next",
      pathname,
    );

    const redirectResponse =
      NextResponse.redirect(loginUrl);

    copyCookies(
      supabaseResponse,
      redirectResponse,
    );

    return redirectResponse;
  }

  /*
   * Logged-in users do not need the login
   * or forgot-password pages.
   *
   * The dashboard request will then decide
   * whether onboarding is required.
   */
  if (
    isLoggedIn &&
    (
      isLoginPage ||
      isForgotPasswordPage
    )
  ) {
    return createRedirectResponse(
      request,
      supabaseResponse,
      "/",
    );
  }

  /*
   * Do not perform profile checks for API,
   * authentication or password recovery routes.
   */
  const shouldCheckProfile =
    isLoggedIn &&
    Boolean(userId) &&
    !isApiRoute &&
    !isAuthRoute &&
    !isLoginPage &&
    !isForgotPasswordPage &&
    !isUpdatePasswordPage;

  if (
    shouldCheckProfile &&
    userId
  ) {
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    /*
     * Avoid creating a redirect loop if the
     * database is temporarily unavailable.
     */
    if (profileError) {
      console.error(
        "Profile onboarding check failed:",
        profileError,
      );

      return supabaseResponse;
    }

    const hasCompletedOnboarding =
      Boolean(profile);

    /*
     * A logged-in user without a profile must
     * complete onboarding before using the app.
     */
    if (
      !hasCompletedOnboarding &&
      !isOnboardingPage
    ) {
      return createRedirectResponse(
        request,
        supabaseResponse,
        "/onboarding",
      );
    }

    /*
     * Users who already have a profile do not
     * need to revisit the onboarding page.
     */
    if (
      hasCompletedOnboarding &&
      isOnboardingPage
    ) {
      return createRedirectResponse(
        request,
        supabaseResponse,
        "/",
      );
    }
  }

  return supabaseResponse;
}