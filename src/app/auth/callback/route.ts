import {
    type NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  export async function GET(
    request: NextRequest,
  ) {
    const code =
      request.nextUrl.searchParams.get(
        "code",
      );
  
    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/forgot-password",
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
        "Password recovery callback failed:",
        error,
      );
  
      return NextResponse.redirect(
        new URL(
          "/forgot-password",
          request.url,
        ),
      );
    }
  
    return NextResponse.redirect(
      new URL(
        "/update-password",
        request.url,
      ),
    );
  }