"use server";

import { revalidatePath } from "next/cache";
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
    await supabase.auth.signInWithPassword({
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

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signUp({
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

  if (!data.session) {
    redirect(
      "/login?message=Check your email to confirm your account.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}