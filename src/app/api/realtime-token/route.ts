import { NextResponse } from "next/server";

type RealtimeSecretResponse = {
  value?: string;
  error?: {
    message?: string;
  };
};

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is missing. Add it to your .env.local file.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime-2.1",
          },
        }),
        cache: "no-store",
      },
    );

    const data = (await response.json()) as RealtimeSecretResponse;

    if (!response.ok || !data.value) {
      console.error("Realtime token error:", data);

      return NextResponse.json(
        {
          error:
            data.error?.message ??
            "The temporary voice token could not be created.",
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json({
      clientSecret: data.value,
    });
  } catch (error) {
    console.error("Realtime token request failed:", error);

    return NextResponse.json(
      {
        error: "Could not connect to the OpenAI Realtime service.",
      },
      { status: 500 },
    );
  }
}