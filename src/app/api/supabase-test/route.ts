export async function GET() {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
  
    const supabaseKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        {
          connected: false,
          error:
            "Supabase environment variables are missing.",
        },
        { status: 500 },
      );
    }
  
    try {
      const response = await fetch(
        `${supabaseUrl}/auth/v1/health`,
        {
          headers: {
            apikey: supabaseKey,
          },
          cache: "no-store",
        },
      );
  
      const data = await response
        .json()
        .catch(() => null);
  
      if (!response.ok) {
        return Response.json(
          {
            connected: false,
            error: `Supabase responded with status ${response.status}.`,
          },
          { status: 500 },
        );
      }
  
      return Response.json({
        connected: true,
        message:
          "Supabase connection successful.",
        service: data?.name ?? "Supabase Auth",
        version: data?.version ?? null,
      });
    } catch (error) {
      return Response.json(
        {
          connected: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not connect to Supabase.",
        },
        { status: 500 },
      );
    }
  }