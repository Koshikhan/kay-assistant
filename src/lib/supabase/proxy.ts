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

  const isLoggedIn =
    !error &&
    Boolean(data?.claims?.sub);

  const pathname =
    request.nextUrl.pathname;

  const isLoginPage =
    pathname === "/login";

  const isForgotPasswordPage =
    pathname === "/forgot-password";

  const isAuthRoute =
    pathname.startsWith("/auth/");

  const isPublicRoute =
    isLoginPage ||
    isForgotPasswordPage ||
    isAuthRoute;

  /*
   * Logged-out users can only access:
   *
   * /login
   * /forgot-password
   * /auth/callback
   *
   * All other pages remain protected.
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
      NextResponse.redirect(
        loginUrl,
      );

    copyCookies(
      supabaseResponse,
      redirectResponse,
    );

    return redirectResponse;
  }

  /*
   * A logged-in user does not need to open
   * the login or forgot-password pages.
   */
  if (
    isLoggedIn &&
    (
      isLoginPage ||
      isForgotPasswordPage
    )
  ) {
    const homeUrl =
      request.nextUrl.clone();

    homeUrl.pathname = "/";
    homeUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(
        homeUrl,
      );

    copyCookies(
      supabaseResponse,
      redirectResponse,
    );

    return redirectResponse;
  }

  return supabaseResponse;
}