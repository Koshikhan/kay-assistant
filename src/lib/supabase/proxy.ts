import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

function copyCookies(
  source: NextResponse,
  target: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function updateSession(
  request: NextRequest,
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            },
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
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

  const { data } =
    await supabase.auth.getClaims();

  const isLoggedIn = Boolean(
    data?.claims?.sub,
  );

  const pathname =
    request.nextUrl.pathname;

  const isLoginPage =
    pathname.startsWith("/login");

  const isAuthRoute =
    pathname.startsWith("/auth");

  if (
    !isLoggedIn &&
    !isLoginPage &&
    !isAuthRoute
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

  if (isLoggedIn && isLoginPage) {
    const homeUrl =
      request.nextUrl.clone();

    homeUrl.pathname = "/";
    homeUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(homeUrl);

    copyCookies(
      supabaseResponse,
      redirectResponse,
    );

    return redirectResponse;
  }

  return supabaseResponse;
}