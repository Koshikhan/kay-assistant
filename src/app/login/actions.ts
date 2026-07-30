"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? "",
  );

  return {
    email,
    password,
  };
}

async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();

  const origin =
    requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const host =
    requestHeaders.get(
      "x-forwarded-host",
    ) ??
    requestHeaders.get("host");

  const protocol =
    requestHeaders.get(
      "x-forwarded-proto",
    ) ??
    (host?.startsWith("localhost")
      ? "http"
      : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return "https://kay-assistant.vercel.app";
}

export async function login(
  formData: FormData,
) {
  const { email, password } =
    getCredentials(formData);

  if (!email || !password) {
    redirect(
      "/login?error=Email and password are required.",
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth
      .signInWithPassword({
        email,
        password,
      });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(
  formData: FormData,
) {
  const { email, password } =
    getCredentials(formData);

  if (!email) {
    redirect(
      "/login?error=Enter a valid email address.",
    );
  }

  if (password.length < 6) {
    redirect(
      "/login?error=Password must contain at least 6 characters.",
    );
  }

  const origin =
    await getRequestOrigin();

  const confirmationMessage =
    encodeURIComponent(
      "Email confirmed successfully. You can now log in.",
    );

  const confirmationDestination =
    `/login?message=${confirmationMessage}`;

  const emailRedirectTo =
    `${origin}/auth/callback` +
    `?flow=signup` +
    `&next=${encodeURIComponent(
      confirmationDestination,
    )}`;

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        emailRedirectTo,
      },
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Check your email and click the confirmation link before logging in.",
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}